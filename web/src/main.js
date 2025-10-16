import './styles.css';
import { Noir } from '@noir-lang/noir_js';
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';

const apiBase = 'http://localhost:3001';
const USER_ID = '68f109a353d2c9002058a176';
const ARTIFACT_URL = '/public/artifacts/balance_threshold.json';

const state = {
  balances: Array(8).fill('0'),
  nonce: '',
  commitment: '',
  artifact: null,
  noir: null,
  backend: null,
  proofHex: '',
  publicInputs: []
};

const statusEl = document.getElementById('status');
const balancesBody = document.getElementById('balances-body');
const debugEl = document.getElementById('debug');
const connectBtn = document.getElementById('connect-btn');
const proveBtn = document.getElementById('prove-btn');
const thresholdInput = document.getElementById('threshold-input');

function bytesToHex(bytes) {
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

async function ensureCircuit() {
  if (state.noir && state.backend) {
    return;
  }

  statusEl.textContent = 'Loading Noir artifact...';
  const response = await fetch(ARTIFACT_URL);
  if (!response.ok) {
    throw new Error(`Unable to fetch circuit artifact (${response.status}).`);
  }

  const artifact = await response.json();
  const noir = new Noir(artifact);
  await noir.init();

  const backend = new BarretenbergBackend(artifact);

  state.artifact = artifact;
  state.noir = noir;
  state.backend = backend;
  renderDebug();
}

function renderBalances() {
  balancesBody.innerHTML = '';
  state.balances.forEach((balance, idx) => {
    const row = document.createElement('tr');
    const indexTd = document.createElement('td');
    const valueTd = document.createElement('td');
    indexTd.textContent = idx + 1;
    valueTd.textContent = balance;
    row.appendChild(indexTd);
    row.appendChild(valueTd);
    balancesBody.appendChild(row);
  });
}

function renderDebug() {
  const payload = {
    artifact_loaded: Boolean(state.artifact),
    balances_pennies: state.balances,
    nonce: state.nonce,
    commitment: state.commitment,
    last_proof_hex: state.proofHex,
    last_public_inputs: state.publicInputs
  };
  debugEl.textContent = JSON.stringify(payload, null, 2);
}

async function callJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json();
}

async function handleConnect() {
  connectBtn.disabled = true;
  proveBtn.disabled = true;

  try {
    await ensureCircuit();
    statusEl.textContent = 'Creating link token...';

    const { link_token: linkToken } = await callJson(`${apiBase}/api/create_link_token`, {
      userId: USER_ID
    });

    statusEl.textContent = `Sandbox link token issued: ${linkToken}`;

    statusEl.textContent = 'Exchanging public token...';
    await callJson(`${apiBase}/api/exchange_public_token`, {
      public_token: 'public-sandbox-token',
      userId: USER_ID
    });

    statusEl.textContent = 'Fetching balances...';
    const balancesResponse = await callJson(`${apiBase}/api/fetch_balances`, {
      userId: USER_ID
    });

    state.balances = balancesResponse.balances_pennies;
    state.nonce = balancesResponse.nonce;
    state.commitment = balancesResponse.commitment;
    state.proofHex = '';
    state.publicInputs = [];

    renderBalances();
    renderDebug();

    statusEl.textContent = `Balances loaded. Suggested threshold: ${balancesResponse.threshold_suggestion}`;
    proveBtn.disabled = false;
  } catch (err) {
    console.error(err);
    statusEl.textContent = `Error loading balances: ${err.message}`;
    connectBtn.disabled = false;
  }
}

function computeClientCommitment(balances, nonce) {
  const data = [...balances, nonce].join('|');
  let hash = 0;
  for (let i = 0; i < data.length; i += 1) {
    hash = (hash * 31 + data.charCodeAt(i)) >>> 0;
  }
  return `0x${hash.toString(16).padStart(8, '0')}`;
}

async function handleProve() {
  const threshold = thresholdInput.value || '0';
  proveBtn.disabled = true;
  statusEl.textContent = 'Generating Noir proof...';

  try {
    await ensureCircuit();

    const computedCommitment = computeClientCommitment(state.balances, state.nonce);
    if (computedCommitment !== state.commitment) {
      throw new Error('Local commitment mismatch. Please refetch balances.');
    }

    const inputs = {
      balances: state.balances.map((value) => value.toString()),
      property_price: threshold.toString()
    };

    const { witness } = await state.noir.execute(inputs);
    const proofData = await state.backend.generateProof(witness);
    const proofHex = bytesToHex(proofData.proof);

    state.proofHex = proofHex;
    state.publicInputs = proofData.publicInputs;
    renderDebug();

    const body = {
      proofHex,
      public_inputs: proofData.publicInputs,
      threshold_pennies: threshold,
      public_commitment: state.commitment,
      balances_pennies: state.balances,
      nonce: state.nonce
    };

    const verifyResponse = await callJson(`${apiBase}/api/verify`, body);

    if (verifyResponse.ok) {
      statusEl.textContent = `✅ Verified at ${verifyResponse.verified_at}`;
    } else {
      statusEl.textContent = `❌ Verification failed: ${verifyResponse.error}`;
    }
  } catch (err) {
    console.error(err);
    if (/ENETUNREACH|ECONN/.test(err.message)) {
      statusEl.textContent = 'Proof generation failed: CRS download was blocked. See README for offline setup instructions.';
    } else {
      statusEl.textContent = `Error generating proof: ${err.message}`;
    }
  } finally {
    proveBtn.disabled = false;
  }
}

connectBtn.addEventListener('click', handleConnect);
proveBtn.addEventListener('click', handleProve);

renderBalances();
renderDebug();

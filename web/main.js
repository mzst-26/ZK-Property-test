const apiBase = 'http://localhost:3001';
const USER_ID = '68f109a353d2c9002058a176';

const state = {
  balances: Array(8).fill('0'),
  artifact: null,
  proofHex: '',
  publicInputs: []
};

const statusEl = document.getElementById('status');
const balancesBody = document.getElementById('balances-body');
const debugEl = document.getElementById('debug');
const connectBtn = document.getElementById('connect-btn');
const proveBtn = document.getElementById('prove-btn');
const thresholdInput = document.getElementById('threshold-input');

async function loadArtifact() {
  if (state.artifact) return state.artifact;
  const res = await fetch('./public/artifacts/balance_threshold.json');
  if (!res.ok) {
    throw new Error(`Failed to fetch artifact: ${res.status}`);
  }
  state.artifact = await res.json();
  renderDebug();
  return state.artifact;
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
    artifact: state.artifact,
    balances_pennies: state.balances,
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
  statusEl.textContent = 'Creating link token...';
  connectBtn.disabled = true;
  try {
    await loadArtifact();
    const { link_token } = await callJson(`${apiBase}/api/create_link_token`, {
      userId: USER_ID
    });

    statusEl.textContent = `Sandbox link token issued: ${link_token}`;

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

    renderBalances();
    renderDebug();

    statusEl.textContent = `Balances loaded. Suggested threshold: ${balancesResponse.threshold_suggestion}`;
    proveBtn.disabled = false;
  } catch (err) {
    console.error(err);
    statusEl.textContent = `Error: ${err.message}`;
    connectBtn.disabled = false;
  }
}

async function handleProve() {
  statusEl.textContent = 'Generating proof (mock)...';
  proveBtn.disabled = true;
  const threshold = thresholdInput.value || '0';
  try {
    await loadArtifact();

    const proofHex = '0xmockedproof';
    const publicInputs = [threshold];

    state.proofHex = proofHex;
    state.publicInputs = publicInputs;
    renderDebug();

    const body = {
      proofHex,
      public_inputs: publicInputs,
      threshold_pennies: threshold
    };

    const verifyResponse = await callJson(`${apiBase}/api/verify`, body);

    if (verifyResponse.ok) {
      statusEl.textContent = `✅ Verified at ${verifyResponse.verified_at}`;
    } else {
      statusEl.textContent = `❌ Verification failed: ${verifyResponse.error}`;
    }
  } catch (err) {
    console.error(err);
    statusEl.textContent = `Error: ${err.message}`;
  } finally {
    proveBtn.disabled = false;
  }
}

connectBtn.addEventListener('click', handleConnect);
proveBtn.addEventListener('click', handleProve);

renderBalances();
renderDebug();

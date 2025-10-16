import cors from 'cors';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';

const app = express();
const PORT = process.env.PORT || 3001;

const PLAID_CLIENT_ID = '68f109a353d2c9002058a176';
const PLAID_SECRET = 'sandbox-14a1ae6cbcedb336e6d67c35a8448a';
const DEMO_USER_ID = '68f109a353d2c9002058a176';
const DEMO_BALANCES_PENCE = [1250000, 880000, 640000, 420000];
const MAX_ACCOUNTS = 8;
const THRESHOLD_SUGGESTION = 3000000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactPath = path.resolve(__dirname, '../../web/public/artifacts/balance_threshold.json');

let backendPromise;
let circuitArtifact;

app.use(cors());
app.use(express.json());

async function loadArtifact() {
  if (!circuitArtifact) {
    const raw = await fs.readFile(artifactPath, 'utf-8');
    circuitArtifact = JSON.parse(raw);
  }
  return circuitArtifact;
}

async function getBackend() {
  if (!backendPromise) {
    backendPromise = (async () => {
      const artifact = await loadArtifact();
      return new BarretenbergBackend(artifact);
    })();
  }
  return backendPromise;
}

function toEightAccounts(values) {
  const padded = [...values];
  while (padded.length < MAX_ACCOUNTS) {
    padded.push(0);
  }
  return padded.slice(0, MAX_ACCOUNTS);
}

function computeCommitment(balances, nonce) {
  const data = [...balances, nonce].join('|');
  let hash = 0;
  for (let i = 0; i < data.length; i += 1) {
    hash = (hash * 31 + data.charCodeAt(i)) >>> 0;
  }
  return `0x${hash.toString(16).padStart(8, '0')}`;
}

function formatBalancesRaw() {
  const raw = toEightAccounts(DEMO_BALANCES_PENCE);
  return raw.map((value) => String(value));
}

function hexToUint8Array(hex) {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (normalized.length % 2 !== 0) {
    throw new Error('Proof hex must have an even length.');
  }
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

app.get('/healthz', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/create_link_token', (req, res) => {
  const { userId = DEMO_USER_ID } = req.body || {};

  res.json({
    link_token: `link-sandbox-${PLAID_CLIENT_ID}`,
    userId,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  });
});

app.post('/api/exchange_public_token', (req, res) => {
  const { public_token, userId = DEMO_USER_ID } = req.body || {};
  const expectedToken = 'public-sandbox-token';

  if (public_token && public_token !== expectedToken) {
    return res.status(400).json({
      ok: false,
      error: 'Unexpected public token in stub environment.'
    });
  }

  res.json({
    ok: true,
    userId,
    access_token: `access-sandbox-${PLAID_SECRET}`
  });
});

app.post('/api/fetch_balances', async (req, res) => {
  try {
    await loadArtifact();
  } catch (err) {
    return res.status(500).json({ ok: false, error: `Failed to load Noir artifact: ${err.message}` });
  }

  const { userId = DEMO_USER_ID } = req.body || {};
  const balances = formatBalancesRaw();
  const nonce = String(Date.now());
  const commitment = computeCommitment(balances, nonce);
  const sum = balances.reduce((acc, value) => acc + Number(value), 0);

  return res.json({
    userId,
    balances_pennies: balances,
    nonce,
    commitment,
    total_balance_pennies: String(sum),
    threshold_suggestion: String(THRESHOLD_SUGGESTION)
  });
});

app.post('/api/verify', async (req, res) => {
  const {
    proofHex,
    public_inputs: publicInputs,
    threshold_pennies,
    public_commitment,
    balances_pennies = [],
    nonce
  } = req.body || {};

  if (!proofHex) {
    return res.status(400).json({ ok: false, error: 'Missing proofHex.' });
  }

  if (!Array.isArray(publicInputs)) {
    return res.status(400).json({ ok: false, error: 'public_inputs must be provided as an array.' });
  }

  if (!Array.isArray(balances_pennies) || balances_pennies.length !== MAX_ACCOUNTS) {
    return res.status(400).json({
      ok: false,
      error: `balances_pennies must be an array of length ${MAX_ACCOUNTS}.`
    });
  }

  if (!nonce) {
    return res.status(400).json({ ok: false, error: 'Missing nonce.' });
  }

  const expectedCommitment = computeCommitment(balances_pennies, nonce);
  if (expectedCommitment !== public_commitment) {
    return res.status(400).json({
      ok: false,
      error: 'Commitment mismatch.'
    });
  }

  const thresholdValue = Number(threshold_pennies || 0);
  if (Number.isNaN(thresholdValue)) {
    return res.status(400).json({ ok: false, error: 'Invalid threshold.' });
  }

  try {
    const backend = await getBackend();
    const proof = hexToUint8Array(proofHex);
    const proofData = {
      proof,
      publicInputs
    };

    if (!publicInputs.length || publicInputs[0] !== thresholdValue.toString()) {
      return res.status(400).json({ ok: false, error: 'Proof public input does not match requested threshold.' });
    }

    const verified = await backend.verifyProof(proofData);
    if (!verified) {
      return res.status(400).json({ ok: false, error: 'Proof verification failed.' });
    }
  } catch (err) {
    console.error('Verification error', err);
    return res.status(500).json({ ok: false, error: `Verifier error: ${err.message}` });
  }

  return res.json({ ok: true, verified_at: new Date().toISOString() });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Mock Plaid + Noir server listening on http://localhost:${PORT}`);
});

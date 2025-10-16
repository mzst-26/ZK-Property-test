import cors from 'cors';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const app = express();
const PORT = process.env.PORT || 3001;

const MAX_ACCOUNTS = 8;
const THRESHOLD_SUGGESTION = 3000000;
const DEFAULT_CLIENT_NAME = process.env.PLAID_CLIENT_NAME || 'ZK Property Demo';
const DEFAULT_COUNTRY_CODES = (process.env.PLAID_COUNTRY_CODES || 'US')
  .split(',')
  .map((code) => code.trim().toUpperCase())
  .filter(Boolean);

const plaidEnvName = (process.env.PLAID_ENV || 'sandbox').toLowerCase();
const plaidEnvironment = PlaidEnvironments[plaidEnvName];

if (!plaidEnvironment) {
  throw new Error(`Unsupported PLAID_ENV value: ${process.env.PLAID_ENV}.`);
}

const plaidClientId = process.env.PLAID_CLIENT_ID;
const plaidSecret = process.env.PLAID_SECRET;

if (!plaidClientId || !plaidSecret) {
  throw new Error('PLAID_CLIENT_ID and PLAID_SECRET must be set before starting the server.');
}

const plaidClient = new PlaidApi(
  new Configuration({
    basePath: plaidEnvironment,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': plaidClientId,
        'PLAID-SECRET': plaidSecret
      }
    }
  })
);

const accessTokenStore = new Map();

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

function toStringPence(values) {
  return values.map((value) => String(Number(value) || 0));
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

app.post('/api/create_link_token', async (req, res) => {
  const { userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({ ok: false, error: 'userId is required.' });
  }

  try {
    const request = {
      client_name: DEFAULT_CLIENT_NAME,
      user: { client_user_id: userId },
      products: ['auth'],
      language: 'en',
      country_codes: DEFAULT_COUNTRY_CODES
    };

    if (process.env.PLAID_REDIRECT_URI) {
      request.redirect_uri = process.env.PLAID_REDIRECT_URI;
    }

    const response = await plaidClient.linkTokenCreate(request);
    return res.json({
      link_token: response.data.link_token,
      expiration: response.data.expiration,
      request_id: response.data.request_id
    });
  } catch (err) {
    console.error('Plaid link token error', err);
    return res.status(500).json({ ok: false, error: `Plaid error: ${err.response?.data?.error_message || err.message}` });
  }
});

app.post('/api/exchange_public_token', async (req, res) => {
  const { public_token: publicToken, userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({ ok: false, error: 'userId is required.' });
  }

  if (!publicToken) {
    return res.status(400).json({ ok: false, error: 'public_token is required.' });
  }

  try {
    const response = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
    const accessToken = response.data.access_token;
    accessTokenStore.set(userId, accessToken);

    return res.json({
      ok: true,
      item_id: response.data.item_id
    });
  } catch (err) {
    console.error('Plaid exchange error', err);
    return res.status(500).json({ ok: false, error: `Plaid error: ${err.response?.data?.error_message || err.message}` });
  }
});

app.post('/api/fetch_balances', async (req, res) => {
  try {
    await loadArtifact();
  } catch (err) {
    return res.status(500).json({ ok: false, error: `Failed to load Noir artifact: ${err.message}` });
  }

  const { userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({ ok: false, error: 'userId is required.' });
  }

  const accessToken = accessTokenStore.get(userId);
  if (!accessToken) {
    return res.status(400).json({ ok: false, error: 'No Plaid access token found for this user. Complete Link first.' });
  }

  try {
    const response = await plaidClient.accountsBalanceGet({ access_token: accessToken });
    const balancesRaw = response.data.accounts.map((account) => {
      const value = account.balances.current ?? account.balances.available ?? 0;
      return Number.isFinite(value) ? value : 0;
    });

    const balancesPence = toStringPence(
      toEightAccounts(
        balancesRaw.map((value) => Math.round((Number(value) || 0) * 100))
      )
    );

    const nonce = String(Date.now());
    const commitment = computeCommitment(balancesPence, nonce);
    const sum = balancesPence.reduce((acc, value) => acc + Number(value), 0);

    return res.json({
      userId,
      balances_pennies: balancesPence,
      nonce,
      commitment,
      total_balance_pennies: String(sum),
      threshold_suggestion: String(Math.max(sum, THRESHOLD_SUGGESTION)),
      plaid_accounts: response.data.accounts.map((account) => ({
        account_id: account.account_id,
        name: account.name,
        mask: account.mask,
        official_name: account.official_name,
        subtype: account.subtype,
        type: account.type
      }))
    });
  } catch (err) {
    console.error('Plaid balance error', err);
    return res.status(500).json({ ok: false, error: `Plaid error: ${err.response?.data?.error_message || err.message}` });
  }
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

  if (threshold_pennies === undefined) {
    return res.status(400).json({ ok: false, error: 'threshold_pennies is required.' });
  }

  const thresholdValue = Number(threshold_pennies || 0);
  if (Number.isNaN(thresholdValue)) {
    return res.status(400).json({ ok: false, error: 'Invalid threshold.' });
  }
  const thresholdStr = String(Math.trunc(thresholdValue));

  try {
    const backend = await getBackend();
    const proof = hexToUint8Array(proofHex);
    const proofData = {
      proof,
      publicInputs
    };

    if (!publicInputs.length || String(publicInputs[0]) !== thresholdStr) {
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

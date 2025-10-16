import cors from 'cors';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

const PLAID_CLIENT_ID = '68f109a353d2c9002058a176';
const PLAID_SECRET = 'sandbox-14a1ae6cbcedb336e6d67c35a8448a';
const DEMO_USER_ID = '68f109a353d2c9002058a176';
const DEMO_BALANCES_PENCE = [1250000, 880000, 640000, 420000];
const MAX_ACCOUNTS = 8;
const THRESHOLD_SUGGESTION = 3000000;

app.use(cors());
app.use(express.json());

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

app.post('/api/fetch_balances', (req, res) => {
  const { userId = DEMO_USER_ID } = req.body || {};
  const balances = formatBalancesRaw();
  const nonce = String(Date.now());
  const commitment = computeCommitment(balances, nonce);
  const sum = balances.reduce((acc, value) => acc + Number(value), 0);

  res.json({
    userId,
    balances_pennies: balances,
    nonce,
    commitment,
    total_balance_pennies: String(sum),
    threshold_suggestion: String(THRESHOLD_SUGGESTION)
  });
});

app.post('/api/verify', (req, res) => {
  const {
    proofHex,
    threshold_pennies,
    public_commitment,
    balances_pennies = [],
    nonce
  } = req.body || {};

  if (!proofHex) {
    return res.status(400).json({ ok: false, error: 'Missing proofHex.' });
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

  const total = balances_pennies.reduce((acc, value) => acc + Number(value), 0);
  const thresholdValue = Number(threshold_pennies || 0);

  if (Number.isNaN(thresholdValue)) {
    return res.status(400).json({ ok: false, error: 'Invalid threshold.' });
  }

  if (thresholdValue <= total) {
    return res.json({ ok: true, verified_at: new Date().toISOString() });
  }

  return res.status(400).json({
    ok: false,
    error: 'Threshold not satisfied in mocked verifier.'
  });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Mock Plaid + Noir server listening on http://localhost:${PORT}`);
});

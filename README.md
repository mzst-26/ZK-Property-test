# ZK Property Test Harness

This repository now includes a working Noir circuit, client-side prover, and server-side verifier for the balance ≥ threshold demo described in the project brief. The Plaid integration now talks to the real API so you can link an account (sandbox, development, or production depending on your credentials), pull current balances, and only generate a proof when the sum meets the property price you enter.

## Repository layout

- `noir/balance_threshold/` – Noir workspace that proves the sum of eight balances is at least a public property price.
- `server/` – Express API that exchanges Plaid Link tokens, fetches live balances, and verifies Noir proofs.
- `web/` – Vite-powered single page app that walks through the sandbox flow and generates proofs in the browser.

## Prerequisites

- Node.js 18+
- [`noirup`](https://github.com/noir-lang/noirup) to install the Noir toolchain

## Building the circuit

1. Install Noir if you have not already:
   ```bash
   curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
   source ~/.bashrc
   noirup -v 0.32.0
   ```
2. Compile the circuit and copy the artifact to the web app:
   ```bash
   cd noir/balance_threshold
   nargo compile
   cp target/balance_threshold.json ../../web/public/artifacts/balance_threshold.json
   ```
   The compiled files in `noir/balance_threshold/target/` are build artifacts and are ignored by git. Only the copy that lives
   under `web/public/artifacts/` is versioned so the browser can load it.

## Installing dependencies

```bash
# Backend
cd server
npm install

# Frontend (separate terminal)
cd web
npm install
```

> **First-run note:** Barretenberg downloads the BN254 CRS the first time you generate a proof. Ensure the machine can reach `https://aztec-ignition.s3.amazonaws.com`, or pre-populate `~/.bb-crs` with the ignition SRS to avoid network failures during proof generation.

## Configuring Plaid credentials

Set the following environment variables before starting the server:

| Variable | Description |
| --- | --- |
| `PLAID_CLIENT_ID` | Your Plaid client id. |
| `PLAID_SECRET` | Your Plaid secret for the chosen environment. |
| `PLAID_ENV` | `sandbox`, `development`, or `production` (defaults to `sandbox`). |
| `PLAID_CLIENT_NAME` | Optional override for the name shown in Plaid Link (defaults to `ZK Property Demo`). |
| `PLAID_COUNTRY_CODES` | Comma-separated list of country codes (defaults to `US`). |
| `PLAID_REDIRECT_URI` | Optional redirect URI if your Plaid configuration requires one. |

Export them in the shell that will run the backend, e.g.:

```bash
export PLAID_CLIENT_ID=your-client-id
export PLAID_SECRET=your-secret
export PLAID_ENV=sandbox
```

You can also copy `server/.env.example` to `.env` inside the `server/` directory and tweak the values before running `npm run dev`.

## Running the demo

1. Start the Express API after configuring your Plaid credentials:
   ```bash
   cd server
   npm run dev
   ```
   The API listens on <http://localhost:3001> and stores Plaid access tokens in memory for the session.

2. In another terminal, launch the web client:
   ```bash
   cd web
   npm run dev
   ```
   Vite serves the UI at <http://localhost:8080>.

3. Open the web app, click **Connect bank** to launch Plaid Link, and complete the login for the account you want to prove against. Once the balances load, enter the property price in pence and click **Generate proof & verify**. The UI refuses to generate a proof if your balances are below the property price; otherwise it proves and verifies end-to-end.

## How the pieces map to the high-level flow

If you are new to zero-knowledge tooling, start with [`docs/zero-knowledge-walkthrough.md`](docs/zero-knowledge-walkthrough.md). It breaks the repository down into the same four steps described in the project brief:

1. Installing the Aztec/Noir tooling.
2. Writing the Noir circuit.
3. Generating the proof on the client.
4. Verifying the proof on the server.

Each section points at the exact files to read so you can connect the prose explanation with the working code.

## API contract

| Route | Method | Notes |
| --- | --- | --- |
| `/api/create_link_token` | POST | Calls Plaid to mint a real link token for the provided `userId`. |
| `/api/exchange_public_token` | POST | Exchanges the Plaid `public_token` for an access token stored in memory. |
| `/api/fetch_balances` | POST | Fetches live account balances, converts them to pence, and zero-pads to eight entries before returning them to the browser. |
| `/api/verify` | POST | Checks the Noir proof against the published threshold. Only the proof and public inputs are accepted by this route. |

A `/healthz` endpoint is available for liveness checks.

## Noir circuit

`noir/balance_threshold/src/main.nr` adds eight unsigned 64-bit balances and constrains the sum to be ≥ the public `property_price`. Balances remain private witness values; the property price is the only public input. The repository keeps the compiled artifact synchronized with the web client under `web/public/artifacts/balance_threshold.json`.

To try different balances locally without Plaid you can still adjust the server to return deterministic values, but the default configuration now hits Plaid's APIs using the credentials you provide.

## Acceptance scenarios

- **Happy path** – threshold ≤ sum of balances returns `✅` after the Barretenberg verifier approves the proof.
- **Insufficient funds** – threshold > sum triggers Noir proof failure (client-side) or a verifier rejection (`❌`).
- **Multiple accounts** – balances are padded to eight slots before proving.

## Troubleshooting

- **CRS download blocked** – if proof generation errors with `ENETUNREACH`, manually download the Ignition SRS on a networked machine and copy the `bn254_g1.dat` / `bn254_g2.dat` files into `~/.bb-crs`.
- **Stale artifact** – the web app will refuse to prove if the artifact at `web/public/artifacts/balance_threshold.json` does not match the compiled circuit. Re-run `nargo compile` and copy the new artifact to resolve this.


# ZK Property Test Harness

This repository now includes a working Noir circuit, client-side prover, and server-side verifier for the balance ≥ threshold demo described in the project brief. The Plaid interactions remain mocked for speed, but the zero-knowledge flow compiles and verifies real proofs using Noir and the Barretenberg backend.

## Repository layout

- `noir/balance_threshold/` – Noir workspace that proves the sum of eight balances is at least a public property price.
- `server/` – Express API that mints sandbox Plaid tokens, returns deterministic balances, and verifies Noir proofs.
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

## Running the demo

1. Start the Express API:
   ```bash
   cd server
   npm run dev
   ```
   The API listens on <http://localhost:3001> and exposes the endpoints required in the brief.

2. In another terminal, launch the web client:
   ```bash
   cd web
   npm run dev
   ```
   Vite serves the UI at <http://localhost:8080>.

3. Open the web app, click **Connect bank (sandbox)** to fetch balances, then click **Generate proof & verify** once the nonce and commitment load. When the total balance meets the entered threshold the UI displays `✅ Verified`.

## API contract

| Route | Method | Notes |
| --- | --- | --- |
| `/api/create_link_token` | POST | Returns a mocked Plaid link token derived from the provided user id. |
| `/api/exchange_public_token` | POST | Accepts `public_token` and responds with a stub access token. |
| `/api/fetch_balances` | POST | Returns padded balances, nonce, commitment, and a suggested threshold. |
| `/api/verify` | POST | Recomputes the commitment, checks the provided Noir proof against the published threshold, and rejects mismatches. |

A `/healthz` endpoint is available for liveness checks.

## Noir circuit

`noir/balance_threshold/src/main.nr` adds eight unsigned 64-bit balances and constrains the sum to be ≥ the public `property_price`. Balances remain private witness values; the property price is the only public input. The repository keeps the compiled artifact synchronized with the web client under `web/public/artifacts/balance_threshold.json`.

To try different balances locally, adjust `server/src/index.js` and rebuild the circuit with `nargo compile` before restarting the web app.

## Acceptance scenarios

- **Happy path** – threshold ≤ sum of balances returns `✅` after the Barretenberg verifier approves the proof.
- **Insufficient funds** – threshold > sum triggers Noir proof failure (client-side) or a verifier rejection (`❌`).
- **Commitment mismatch** – tampering with the commitment or balances fails verification.
- **Multiple accounts** – balances are padded to eight slots before hashing and proving.

## Troubleshooting

- **CRS download blocked** – if proof generation errors with `ENETUNREACH`, manually download the Ignition SRS on a networked machine and copy the `bn254_g1.dat` / `bn254_g2.dat` files into `~/.bb-crs`.
- **Stale artifact** – the web app will refuse to prove if the artifact at `web/public/artifacts/balance_threshold.json` does not match the compiled circuit. Re-run `nargo compile` and copy the new artifact to resolve this.


# ZK Property Test Harness

This repository implements a fully mocked version of the property-rental proof-of-funds demo described in the project brief. Everything is hard-coded for speed so new teammates can exercise the Plaid flow, client UI, and “verification” loop without live services.

## Repository layout

- `noir/` – placeholder Noir project notes plus a stubbed circuit artifact.
- `server/` – Express server that mocks the Plaid + verifier backend.
- `web/` – Single-page vanilla JS client that walks through the sandbox flow.

## Prerequisites

- Node.js 18+

## Getting started

1. Install dependencies for the server:
   ```bash
   cd server
   npm install
   npm run dev
   ```
   The API listens on <http://localhost:3001> and exposes the endpoints required in the brief.

2. In a separate terminal, serve the web client:
   ```bash
   cd web
   npx http-server -c-1
   ```
   This serves `index.html` at <http://localhost:8080> (or the next available port). Any static server will do; `http-server` keeps the example simple.

3. Open the web app, click **Connect bank (sandbox)**, then **Generate proof & verify** once balances load.

### Previewing the UI without a PR

If you just want to see the mocked flow without pushing a branch or opening a pull request, run the two dev servers above and
open <http://localhost:8080> in your browser. The static site loads directly from your machine, so you get the full experience
locally before sharing any changes.

## API contract

The server exposes the exact routes described in the work breakdown. All values are deterministic for test purposes.

| Route | Method | Notes |
| --- | --- | --- |
| `/api/create_link_token` | POST | Returns a mocked Plaid link token derived from the provided user id. |
| `/api/exchange_public_token` | POST | Accepts `public_token` and responds with a stub access token. |
| `/api/fetch_balances` | POST | Returns padded balances, nonce, commitment, and suggestion for the threshold. |
| `/api/verify` | POST | Recomputes the commitment and checks if the sum of balances meets the provided threshold. |

A simple `/healthz` endpoint is available for liveness checks.

## Mock data

- **Plaid credentials** – `client_id=68f109a353d2c9002058a176`, `secret=sandbox-14a1ae6cbcedb336e6d67c35a8448a` (embedded in the server).
- **Balances** – four accounts with 12,500.00; 8,800.00; 6,400.00; and 4,200.00 GBP respectively (expressed in pence and padded to eight slots).
- **Commitment** – derived from `balances|nonce` using a lightweight hash so the client and server stay consistent.

## Noir artifact

The Noir directory contains a mocked `balance_threshold.json` artifact and example inputs. Swap these with a real build when the circuit is ready; the web client already expects the file at `web/public/artifacts/balance_threshold.json`.

## Acceptance scenarios covered

- **Happy path** – threshold ≤ sum of balances returns `✅`.
- **Insufficient funds** – threshold > sum triggers a server-side `❌`.
- **Commitment mismatch** – tampering with the commitment fails verification.
- **Multiple accounts** – balances are padded to eight slots before hashing.

## Next steps for a real integration

1. Replace the stub Noir artifact with a compiled circuit and hook up the browser proof generation.
2. Swap mocked Plaid responses with live sandbox calls using the provided credentials.
3. Harden the `/verify` route by integrating a real verifier library and removing the extra balances payload once commitments are trusted.
4. Flesh out automated tests as the implementation moves beyond this hard-coded prototype.

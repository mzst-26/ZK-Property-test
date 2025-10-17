# API service

TypeScript Express API that verifies zero-knowledge proofs, manages organization state, and persists content.  The service is
structured around domain-specific services and controllers to keep business logic composable.

## Scripts

- `npm run dev` – start the API with hot reload via `ts-node-dev`.
- `npm run build` – compile TypeScript to the `dist/` directory.
- `npm start` – run the compiled JavaScript build.
- `npm run lint` – lint the source using ESLint.
- `npm test` – run unit tests with Vitest.

## Environment variables

| Name | Description |
| ---- | ----------- |
| `PORT` | HTTP port (defaults to 4000). |
| `DATABASE_URL` | Postgres connection string. |
| `REDIS_URL` | Optional Redis URL for BullMQ queues. |
| `AZTEC_RPC_URL` | Optional Aztec RPC endpoint for root anchoring jobs. |

## Database

`src/db/schema.ts` contains the canonical schema definitions.  Run the statements during bootstrap or integrate them with your
migration tool of choice.

### Domain verification challenge

Organization onboarding now includes a DNS TXT verification step:

- `POST /orgs/:orgId/verification/challenge` – issues/refreshes a token to publish at `_zk-workspace.<domain>` as
  `zk-workspace-verification=<token>`.
- `POST /orgs/:orgId/verification/check` – resolves the TXT record and marks the organization as verified when the token is
  present.

`POST /orgs` automatically seeds an initial challenge and returns the expected DNS record in the response payload so the admin
can begin domain verification immediately.

### Issuer and DKIM key management

After an organization verifies domain ownership, it can configure HR/SSO credential issuers or email infrastructure keys via:

- `GET /orgs/:orgId/keys` – fetch the current issuer public keys and DKIM selector public keys.
- `PUT /orgs/:orgId/keys` – replace both key sets; returns HTTP 409 if the org has not completed the DNS verification step.

Both endpoints operate on the `org_key` table and expect issuer entries of the form `{ kid, jwk, issuer? }` and DKIM entries of
`{ selector, public_key, domain? }`.

## Proof verification

The actual verifier bindings are not implemented yet.  The `proofQueue` stub outlines the job payload for asynchronous proof
checking.  Integrate Barretenberg or another verifier runtime inside a worker and update the controllers to enqueue and await
job completion results.

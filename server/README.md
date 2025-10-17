# API service

TypeScript Express API that verifies zero-knowledge proofs, manages organization state, and persists content.  The service is
structured around domain-specific services and controllers to keep business logic composable.

## Scripts

- `npm run dev` – start the API with hot reload via `ts-node-dev`.
- `npm run build` – compile TypeScript to the `dist/` directory.
- `npm start` – run the compiled JavaScript build.
- `npm run lint` – lint the source using ESLint.

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

## Proof verification

The actual verifier bindings are not implemented yet.  The `proofQueue` stub outlines the job payload for asynchronous proof
checking.  Integrate Barretenberg or another verifier runtime inside a worker and update the controllers to enqueue and await
job completion results.

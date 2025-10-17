# Zero-knowledge workspace walkthrough

This guide explains how the new repository structure supports anonymous-yet-verifiable collaboration inside organizations.
Instead of proving a bank balance, we now focus on enrollment, anonymous signaling, and polls.

## Tooling setup

- **Noir + Barretenberg** – Circuits live under `noir/` as individual packages (`enroll`, `signal`, `vote`, `vote_weighted`).
  Compile them with `nargo compile` to produce artifacts consumed by the frontend and backend verifiers.
- **Frontend** – `web/` is a Next.js application. Noir proofs will be generated client-side via a dedicated worker (see
  `web/lib/proof-worker.ts` for the stub). WebAuthn provides passkey-based sessions.
- **Backend** – `server/` is a TypeScript Express API. Controllers verify proofs, update Merkle roots, manage nullifiers,
  and enqueue asynchronous verification/tally jobs via BullMQ.

## Enrollment circuit

The `noir/enroll` package expresses both eligibility paths:

1. VC path – verifies a credential payload signature against issuer keys and binds the user secret to the org ID.
2. zkEmail path – checks DKIM signatures over invite emails, ensuring the email domain matches the organization.

Both paths derive the same `member_commitment` and `enroll_nullifier`. The backend persists the commitment in the Merkle tree
and rejects duplicate nullifiers.

## Anonymous signaling

`noir/signal` proves Merkle membership, emits a channel-specific nullifier, and an RLN tag derived from the member secret and
current epoch. The backend tracks nullifier usage per channel/epoch to enforce posting quotas.

## Poll voting

`noir/vote` ensures one vote per poll without revealing the choice. Ballots are stored as encrypted commitments that feed into
a tally worker. The optional `noir/vote_weighted` circuit introduces a shareholder registry root to bound per-member weight
without revealing the exact number.

## Frontend flows

- **Admin console** – `/admin` route guides domain verification, verification mode selection, and invite management.
- **Member workspace** – `/member` route illustrates the enrollment proof flow, passkey registration, and RLN-guarded channel
  usage. Components describe how receipts and nullifiers keep actions auditable without deanonymizing members.

## Backend responsibilities

- `/orgs` endpoints manage organization lifecycle and expose configuration.
- `/enrollments` accepts enrollment proofs, inserts commitments, and returns updated Merkle roots.
- Queue workers (stubs) validate proofs asynchronously and can anchor Merkle roots/nullifiers on Aztec for auditability.

Follow this blueprint to implement the remaining verifier integrations and UI interactions. The architecture is intentionally
modular so each component (frontend, backend, circuits) can evolve independently while sharing a consistent data model.

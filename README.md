# ZK Anonymous Workspace Platform

This repository contains a greenfield implementation of an anonymous-yet-accountable workplace communication platform.  
Teams can onboard their organization, register zero-knowledge memberships, and collaborate through anonymous channels and
polls without ever storing personally identifiable information on the platform.

## High-level architecture

- **Frontend (`web/`)** – Next.js + TypeScript application with WebAuthn-based sessions, Noir proof generation in a WebWorker,
  and routes for organization administrators and anonymous members.
- **Backend (`server/`)** – Node.js/TypeScript API with structured modules for organization onboarding, proof verification,
  Merkle root management, RLN quota enforcement, and content persistence in Postgres.
- **Zero-knowledge circuits (`noir/`)** – Noir workspaces for the core ZK proofs: member enrollment, anonymous signaling, and
  one-person-one-vote polls.
- **Documentation (`docs/`)** – Product requirements, detailed architecture, and data model references.

The system is designed to keep PII outside the platform boundary.  Organizations integrate with their identity providers or
mail infrastructure to issue verifiable credentials or DKIM-backed invites.  Members prove eligibility in-circuit, derive
pseudonymous commitments, and interact anonymously while the backend enforces nullifier uniqueness and RLN limits.

## Repository layout

```
.
├── docs/                # Narrative design docs and protocol references
├── noir/                # Noir workspaces for ZK circuits (enroll, signal, vote)
├── server/              # Node.js/TypeScript API with queues and Postgres models
└── web/                 # Next.js app with client-side proving and WebAuthn session layer
```

Each sub-project contains its own README with build steps and development notes.

## Getting started

1. Install the required toolchains:
   - Node.js 20+
   - pnpm or npm
   - `noirup` / `nargo` for Noir circuits
2. Install dependencies in each package (`npm install` in `web/` and `server/`).
3. Follow the docs in `docs/architecture.md` for local environment configuration, Postgres schema setup, and Aztec anchoring
   options.

## Status

This is an initial scaffolding of the platform.  Proof circuits, APIs, and frontend flows are laid out with stubs and
extensive documentation to guide the subsequent implementation work.

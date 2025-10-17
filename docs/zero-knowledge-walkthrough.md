# Zero-knowledge balance verification walkthrough

This guide explains how the repository stitches together Plaid, Noir, and the Barretenberg backend so that you can prove a bank balance clears a property price without disclosing the actual number. It is written for newcomers, so each step focuses on *why* it exists before showing you *where* it lives in the codebase.

## 1. Tooling setup (Aztec/Noir)

- **Why**: We need cryptographic tooling that understands our circuit format and can produce/verifiy proofs. Noir is the language for describing the circuit, while Barretenberg supplies a prover/verifier implementation.
- **Code**:
  - Front-end dependencies (`web/package.json`) pull in `@noir-lang/noir_js` and `@noir-lang/backend_barretenberg` so the browser can prove statements locally.
  - The backend (`server/src/index.js`) imports `@noir-lang/backend_barretenberg` to verify proofs before trusting them.
  - The Noir workspace (`noir/balance_threshold/`) is where we author the circuit and compile it into an artifact the web app can consume.

## 2. Circuit logic

- **Why**: The circuit is the private computation. It describes, in math, exactly what claim is being proven.
- **Code**:
  - `noir/balance_threshold/src/main.nr` keeps the logic small on purpose. It sums eight private balances and asserts that the total is greater than or equal to the public `property_price` input.
  - When you run `nargo compile` the compiled artifact lands in `web/public/artifacts/balance_threshold.json`. This is what browsers and the server read to know how to prove/verify.

## 3. Proof generation on the user's device

- **Why**: Sensitive numbers should never reach the verifier. By generating the proof inside the browser, the user keeps the raw balances local.
- **Code**:
  - `web/src/main.js` is the browser app. It loads the Noir artifact, asks Plaid for balances, and keeps those balances private.
  - Function `handleProve` packages the balances and the property price as circuit inputs, runs `state.noir.execute` to create a witness, and then calls `state.backend.generateProof(witness)` to produce the cryptographic proof.
  - The proof and the public inputs (the property price) are stored in the UI state for transparency/debugging but the balances never leave the browser once the proof is created.

## 4. Verification on the server

- **Why**: The relying party (our backend) only needs to know whether the user qualifies. It should accept or reject proofs without ever seeing the balances.
- **Code**:
  - `server/src/index.js` exposes `/api/verify`. It accepts the Noir proof plus the public inputs (just the property price) and ensures the caller-supplied threshold matches the proof's public input before verifying.
  - With those safety checks in place, it calls `backend.verifyProof({ proof, publicInputs })` using the same circuit artifact to confirm the math is valid. No balances are transmitted or persisted.
  - A `✅` response means the server is satisfied the user’s balances exceed the property price—no sensitive data exchanged.

## Putting it all together

1. The user links their account with Plaid; the backend never sees raw balances.
2. The frontend fetches the balances, runs the Noir circuit locally, and produces a proof.
3. The proof plus the public threshold are sent back to the server.
4. The server verifies the proof; success means "yes, they can afford it" without exposing the actual balance.

When you want to adapt this flow, swap out the circuit logic (step 2) for whatever condition you care about, recompile the artifact, and ensure both the client and server load the updated artifact. The rest of the pipeline stays the same.

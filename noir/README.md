# Noir Circuit Placeholder

This test repository stubs a Noir circuit that would normally prove that the sum of eight padded account balances is greater than or equal to a threshold. The actual circuit is not compiled in this exercise; instead, we provide a mocked artifact for the web client to load during the demo flow.

- `artifacts/balance_threshold.json` mimics the compiled Noir artifact that the browser would normally consume when generating a proof.
- `inputs/example_inputs.json` contains example witness and public input values that match the stubbed server responses.

To replace the stub with a real circuit:

1. Install Noir via `curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash` and then `noirup` to select a toolchain.
2. Run `nargo new balance_threshold` and implement the real constraint logic.
3. Build the circuit with `nargo compile` and copy the resulting `*.json` artifact into `web/public/artifacts/` so the web client can fetch it.


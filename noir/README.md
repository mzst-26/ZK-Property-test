# Balance threshold circuit

`noir/balance_threshold` is a Noir workspace that proves the padded sum of eight account balances (private witnesses) is greater than or equal to a public property price.

## Useful commands

```bash
# Compile with the currently selected noirup toolchain
cd noir/balance_threshold
nargo compile

# Run Noir tests (add your own as needed)
nargo test
```

The compiled artifact lives at `noir/balance_threshold/target/balance_threshold.json`. The `target/` directory is ignored by git;
copy `balance_threshold.json` to `web/public/artifacts/balance_threshold.json` after every rebuild so the browser bundle stays in
sync with the circuit.

Example inputs used by the mocked Plaid server are defined in `server/src/index.js`.

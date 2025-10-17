// This is the "business logic" of the zero-knowledge proof.
// Each `balance` value stays private to the prover, while the
// `property_price` is the single public input everyone can see.
//
// The prover convinces the verifier that the sum of all balances
// is greater than or equal to the property price without leaking
// any individual balance (or even the sum).
fn main(balances: [u64; 8], property_price: pub u64) {
    let mut total: u64 = 0;
    for i in 0..8 {
        total = total + balances[i];
    }
    assert(total >= property_price);
}

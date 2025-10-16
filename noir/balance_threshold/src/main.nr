fn main(balances: [u64; 8], property_price: pub u64) {
    let mut total: u64 = 0;
    for i in 0..8 {
        total = total + balances[i];
    }
    assert(total >= property_price);
}

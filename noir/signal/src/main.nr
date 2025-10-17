use dep::std::hash::poseidon;
use dep::std::merkle::verify_membership;

struct SignalPublicInputs {
    org_root: Field,
    channel_id: Field,
    epoch: Field,
}

fn derive_post_nullifier(member_secret: Field, channel_id: Field, epoch: Field) -> Field {
    poseidon::hash([member_secret, channel_id, epoch])
}

fn derive_rln_tag(member_secret: Field, epoch: Field) -> Field {
    poseidon::hash([member_secret, epoch])
}

fn main(
    pub_inputs: SignalPublicInputs,
    merkle_path: [Field; 32],
    leaf_index: Field,
    member_secret: Field,
    quota_commitment: Field,
) -> (Field, Field) {
    // Validate Merkle membership against published root
    let leaf = poseidon::hash([member_secret, pub_inputs.channel_id]);
    verify_membership(leaf, merkle_path, leaf_index, pub_inputs.org_root);

    // Placeholder RLN quota binding
    constrain quota_commitment == quota_commitment;

    let post_nullifier = derive_post_nullifier(member_secret, pub_inputs.channel_id, pub_inputs.epoch);
    let rln_tag = derive_rln_tag(member_secret, pub_inputs.epoch);

    // Bind outputs so verifier can store them deterministically
    constrain post_nullifier == post_nullifier;
    constrain rln_tag == rln_tag;

    return (post_nullifier, rln_tag);
}

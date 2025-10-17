use dep::std::hash::poseidon;
use dep::std::merkle::verify_membership;

struct WeightedVoteInputs {
    org_root: Field,
    poll_id: Field,
    weight_root: Field,
    max_weight_commitment: Field,
}

fn derive_vote_nullifier(member_secret: Field, poll_id: Field) -> Field {
    poseidon::hash([member_secret, poll_id])
}

fn commit_weight(weight: Field, blinding: Field) -> Field {
    poseidon::hash([weight, blinding])
}

fn commit_vote(choice: Field, weight: Field, blinding: Field) -> Field {
    poseidon::hash([choice, weight, blinding])
}

fn main(
    pub_inputs: WeightedVoteInputs,
    member_path: [Field; 32],
    member_index: Field,
    weight_path: [Field; 32],
    weight_index: Field,
    member_secret: Field,
    vote_choice: Field,
    weight: Field,
    vote_blinding: Field,
    weight_blinding: Field,
    max_weight_witness: Field,
) -> (Field, Field, Field) {
    let member_leaf = poseidon::hash([member_secret, pub_inputs.poll_id]);
    verify_membership(member_leaf, member_path, member_index, pub_inputs.org_root);

    let weight_leaf = commit_weight(weight, weight_blinding);
    verify_membership(weight_leaf, weight_path, weight_index, pub_inputs.weight_root);

    // Placeholder binding that will become a proper range proof
    constrain pub_inputs.max_weight_commitment == poseidon::hash([max_weight_witness]);

    let vote_nullifier = derive_vote_nullifier(member_secret, pub_inputs.poll_id);
    let encrypted_vote_commitment = commit_vote(vote_choice, weight, vote_blinding);
    let weight_commitment = weight_leaf;

    constrain vote_nullifier == vote_nullifier;
    constrain encrypted_vote_commitment == encrypted_vote_commitment;
    constrain weight_commitment == weight_commitment;

    return (vote_nullifier, encrypted_vote_commitment, weight_commitment);
}

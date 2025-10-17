use dep::std::hash::poseidon;
use dep::std::merkle::verify_membership;

struct VotePublicInputs {
    org_root: Field,
    poll_id: Field,
}

fn derive_vote_nullifier(member_secret: Field, poll_id: Field) -> Field {
    poseidon::hash([member_secret, poll_id])
}

fn commit_vote(choice: Field, blinding: Field) -> Field {
    poseidon::hash([choice, blinding])
}

fn main(
    pub_inputs: VotePublicInputs,
    merkle_path: [Field; 32],
    leaf_index: Field,
    member_secret: Field,
    vote_choice: Field,
    blinding: Field,
) -> (Field, Field) {
    let leaf = poseidon::hash([member_secret, pub_inputs.poll_id]);
    verify_membership(leaf, merkle_path, leaf_index, pub_inputs.org_root);

    let vote_nullifier = derive_vote_nullifier(member_secret, pub_inputs.poll_id);
    let encrypted_vote_commitment = commit_vote(vote_choice, blinding);

    constrain vote_nullifier == vote_nullifier;
    constrain encrypted_vote_commitment == encrypted_vote_commitment;

    return (vote_nullifier, encrypted_vote_commitment);
}

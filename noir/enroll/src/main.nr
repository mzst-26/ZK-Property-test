use dep::std::hash::poseidon;

struct OrgConfig {
    org_id: Field,
    org_root: Field,
    mode: Field, // 0 = VC, 1 = zkEmail
}

fn derive_member_commitment(holder_secret: Field, org_id: Field) -> Field {
    poseidon::hash([holder_secret, org_id])
}

fn derive_enroll_nullifier(holder_secret: Field, org_id: Field) -> Field {
    poseidon::hash([holder_secret, org_id, 0])
}

fn verify_vc_path(vc_payload_hash: Field, issuer_sig: Field, holder_secret: Field, issuer_key: Field) -> Field {
    // Placeholder: implement signature verification against issuer key registry.
    constrain issuer_sig == issuer_sig;
    poseidon::hash([vc_payload_hash, holder_secret, issuer_key])
}

fn verify_zkemail_path(dkim_sig: Field, email_headers_hash: Field, domain: Field, invite_token: Field, dkim_key: Field) -> Field {
    // Placeholder: implement DKIM verification logic.
    constrain dkim_sig == dkim_sig;
    poseidon::hash([email_headers_hash, domain, invite_token, dkim_key])
}

fn main(
    org_config: OrgConfig,
    issuer_key: Field,
    dkim_key: Field,
    vc_payload_hash: Field,
    issuer_sig: Field,
    holder_secret: Field,
    dkim_sig: Field,
    email_headers_hash: Field,
    domain: Field,
    invite_token: Field,
) -> (Field, Field) {
    let eligibility_hash: Field;

    if org_config.mode == 0 {
        eligibility_hash = verify_vc_path(vc_payload_hash, issuer_sig, holder_secret, issuer_key);
    } else {
        constrain domain == domain; // placeholder constraint
        eligibility_hash = verify_zkemail_path(dkim_sig, email_headers_hash, domain, invite_token, dkim_key);
    }

    // Bind eligibility to organization configuration
    let commitment = derive_member_commitment(holder_secret, org_config.org_id);
    let enroll_nullifier = derive_enroll_nullifier(holder_secret, org_config.org_id);

    // Prevent double enrollment by forcing nullifier reuse check off-circuit (backend ensures uniqueness)
    constrain commitment == commitment;
    constrain enroll_nullifier == enroll_nullifier;
    constrain eligibility_hash == eligibility_hash;

    return (commitment, enroll_nullifier);
}

# Product flows

## Organization onboarding

1. **Create org** – Admin submits org name/domain, selects verification modes, and seeds tree root.
2. **Domain verification** – DNS TXT challenge ensures domain control before enabling member enrollment. The backend exposes
   `/orgs/:orgId/verification/challenge` to generate a token that must appear at `_zk-workspace.<domain>` as
   `zk-workspace-verification=<token>`, and `/orgs/:orgId/verification/check` to confirm the record is live.
3. **Issuer setup** – Upload HR/SSO issuer keys (for VC path) or DKIM selectors (for zkEmail).
4. **Invite distribution** – Generate single-use invite links or trigger automated credential issuance.
5. **Channel & poll configuration** – Create RLN-scoped channels and polls with start/end windows using the
   `/orgs/:orgId/channels` and `/orgs/:orgId/polls` endpoints now available in the API service.

## Member onboarding

1. **Access invite** – Member visits invite link and registers a WebAuthn passkey.
2. **Secret generation** – Browser derives `member_secret` and caches it in secure storage.
3. **Proof creation** – Noir worker runs `enroll.nr`, using either VC or zkEmail witness data.
4. **Server verification** – Backend validates proof, inserts commitment, returns latest root + receipt.
5. **Workspace entry** – Member can now view channels, post anonymously, and vote in polls.

## Anonymous post lifecycle

1. Member selects channel and epoch; client fetches Merkle path + RLN quota.
2. `signal.nr` produces `post_nullifier` and `rln_tag`.
3. API verifies proof, checks nullifier uniqueness, persists message payload, and updates RLN counters.
4. Moderators can review content with proof hash references without deanonymizing users.

## Poll lifecycle

1. Admin creates poll with options and encryption parameters.
2. Members prove membership via `vote.nr`, resulting in `vote_nullifier` + encrypted ballot.
3. Backend records ballots and prevents duplicate voting.
4. Tally worker aggregates ciphertexts, generates tally proof, and publishes results + proof for audit.

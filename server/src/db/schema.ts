export const schema = {
  org: `
    CREATE TABLE IF NOT EXISTS org (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT NOT NULL UNIQUE,
      verification_modes JSONB NOT NULL,
      tree_root_current BYTEA NOT NULL,
      tree_roots_history JSONB NOT NULL DEFAULT '[]'::jsonb,
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  orgKey: `
    CREATE TABLE IF NOT EXISTS org_key (
      org_id UUID REFERENCES org(id) ON DELETE CASCADE,
      issuer_pubkeys JSONB NOT NULL DEFAULT '[]'::jsonb,
      dkim_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
      PRIMARY KEY (org_id)
    );
  `,
  membership: `
    CREATE TABLE IF NOT EXISTS membership (
      org_id UUID REFERENCES org(id) ON DELETE CASCADE,
      leaf_index BIGINT NOT NULL,
      commitment BYTEA NOT NULL,
      enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (org_id, leaf_index)
    );
  `,
  nullifier: `
    CREATE TABLE IF NOT EXISTS nullifier (
      org_id UUID REFERENCES org(id) ON DELETE CASCADE,
      scope_type TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      nullifier BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (org_id, scope_type, scope_id, nullifier)
    );
  `,
  channel: `
    CREATE TABLE IF NOT EXISTS channel (
      id UUID PRIMARY KEY,
      org_id UUID REFERENCES org(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      rln_quota INTEGER NOT NULL DEFAULT 10,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  post: `
    CREATE TABLE IF NOT EXISTS post (
      id UUID PRIMARY KEY,
      channel_id UUID REFERENCES channel(id) ON DELETE CASCADE,
      content_ptr TEXT NOT NULL,
      proof_hash BYTEA NOT NULL,
      post_nullifier BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  poll: `
    CREATE TABLE IF NOT EXISTS poll (
      id UUID PRIMARY KEY,
      org_id UUID REFERENCES org(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      options JSONB NOT NULL,
      mode TEXT NOT NULL,
      start TIMESTAMPTZ,
      "end" TIMESTAMPTZ,
      tally JSONB,
      tally_proof JSONB
    );
  `,
  ballot: `
    CREATE TABLE IF NOT EXISTS ballot (
      poll_id UUID REFERENCES poll(id) ON DELETE CASCADE,
      commitment_ptr TEXT NOT NULL,
      proof_hash BYTEA NOT NULL,
      vote_nullifier BYTEA NOT NULL,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (poll_id, vote_nullifier)
    );
  `
};

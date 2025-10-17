import type { PoolClient } from "pg";

export interface IssuerPublicKey {
  kid: string;
  jwk: Record<string, unknown>;
  issuer?: string;
}

export interface DkimPublicKey {
  selector: string;
  public_key: string;
  domain?: string;
}

export interface OrgKeyRecord {
  org_id: string;
  issuer_pubkeys: IssuerPublicKey[];
  dkim_keys: DkimPublicKey[];
}

interface OrgKeyRow {
  org_id: string;
  issuer_pubkeys: unknown;
  dkim_keys: unknown;
}

export class OrgKeyService {
  constructor(private readonly client: PoolClient) {}

  async upsert(
    orgId: string,
    input: {
      issuer_pubkeys?: IssuerPublicKey[];
      dkim_keys?: DkimPublicKey[];
    }
  ): Promise<OrgKeyRecord> {
    const issuerKeys = input.issuer_pubkeys ?? [];
    const dkimKeys = input.dkim_keys ?? [];

    const result = await this.client.query<OrgKeyRow>(
      `INSERT INTO org_key (org_id, issuer_pubkeys, dkim_keys)
         VALUES ($1, $2::jsonb, $3::jsonb)
         ON CONFLICT (org_id)
         DO UPDATE SET issuer_pubkeys = EXCLUDED.issuer_pubkeys,
                       dkim_keys = EXCLUDED.dkim_keys
       RETURNING org_id, issuer_pubkeys, dkim_keys`,
      [orgId, JSON.stringify(issuerKeys), JSON.stringify(dkimKeys)]
    );

    return deserialize(result.rows[0]);
  }

  async get(orgId: string): Promise<OrgKeyRecord | null> {
    const result = await this.client.query<OrgKeyRow>(
      `SELECT org_id, issuer_pubkeys, dkim_keys
         FROM org_key
        WHERE org_id = $1`,
      [orgId]
    );

    const row = result.rows[0];
    return row ? deserialize(row) : null;
  }
}

function deserialize(row: OrgKeyRow): OrgKeyRecord {
  return {
    org_id: row.org_id,
    issuer_pubkeys: normalizeJson(row.issuer_pubkeys, [] as IssuerPublicKey[]),
    dkim_keys: normalizeJson(row.dkim_keys, [] as DkimPublicKey[])
  };
}

function normalizeJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (Array.isArray(value)) {
    return value as T;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      return fallback;
    }
  }

  return value as T;
}

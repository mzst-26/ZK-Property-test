import type { PoolClient } from "pg";
import { z } from "zod";

const orgModesSchema = z.array(z.enum(["vc", "zkEmail"]));

type OrgMode = z.infer<typeof orgModesSchema>[number];

export interface OrgRecord {
  id: string;
  name: string;
  domain: string;
  verification_modes: OrgMode[];
  tree_root_current: Buffer;
  tree_roots_history: unknown[];
  settings: Record<string, unknown>;
  created_at: Date;
}

export class OrgService {
  constructor(private readonly client: PoolClient) {}

  async createOrg(input: {
    id: string;
    name: string;
    domain: string;
    verification_modes: OrgMode[];
    tree_root_current: Buffer;
    settings?: Record<string, unknown>;
  }): Promise<OrgRecord> {
    orgModesSchema.parse(input.verification_modes);

    const result = await this.client.query<OrgRecord>(
      `INSERT INTO org (id, name, domain, verification_modes, tree_root_current, settings)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.id,
        input.name,
        input.domain,
        JSON.stringify(input.verification_modes),
        input.tree_root_current,
        JSON.stringify(input.settings ?? {})
      ]
    );

    return result.rows[0];
  }

  async getOrgByDomain(domain: string): Promise<OrgRecord | null> {
    const result = await this.client.query<OrgRecord>(
      `SELECT * FROM org WHERE domain = $1`,
      [domain]
    );

    return result.rows[0] ?? null;
  }

  async getOrgById(id: string): Promise<OrgRecord | null> {
    const result = await this.client.query<OrgRecord>(
      `SELECT * FROM org WHERE id = $1`,
      [id]
    );

    return result.rows[0] ?? null;
  }

  async updateTreeRoot(orgId: string, newRoot: Buffer): Promise<void> {
    await this.client.query(
      `UPDATE org
         SET tree_roots_history = jsonb_insert(tree_roots_history, '{0}', to_jsonb(tree_root_current::text), true),
             tree_root_current = $2
       WHERE id = $1`,
      [orgId, newRoot]
    );
  }
}

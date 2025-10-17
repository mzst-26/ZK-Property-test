import type { PoolClient } from "pg";

export interface MembershipRecord {
  org_id: string;
  leaf_index: number;
  commitment: Buffer;
  enrolled_at: Date;
}

export class MembershipService {
  constructor(private readonly client: PoolClient) {}

  async insertMember(input: MembershipRecord): Promise<void> {
    await this.client.query(
      `INSERT INTO membership (org_id, leaf_index, commitment, enrolled_at)
       VALUES ($1, $2, $3, $4)`,
      [input.org_id, input.leaf_index, input.commitment, input.enrolled_at]
    );
  }

  async getLatestLeafIndex(orgId: string): Promise<number> {
    const result = await this.client.query<{ max: string | null }>(
      `SELECT MAX(leaf_index) as max FROM membership WHERE org_id = $1`,
      [orgId]
    );

    const value = result.rows[0]?.max;
    return value ? Number(value) : -1;
  }
}

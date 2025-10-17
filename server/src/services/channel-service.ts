import type { PoolClient } from "pg";
import { z } from "zod";

export interface ChannelRecord {
  id: string;
  org_id: string;
  name: string;
  rln_quota: number;
  created_at: Date;
}

const channelInsertSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  name: z.string().min(1),
  rln_quota: z.number().int().positive()
});

export class ChannelService {
  constructor(private readonly client: PoolClient) {}

  async createChannel(input: {
    id: string;
    org_id: string;
    name: string;
    rln_quota: number;
  }): Promise<ChannelRecord> {
    const parsed = channelInsertSchema.parse(input);

    const result = await this.client.query<ChannelRecord>(
      `INSERT INTO channel (id, org_id, name, rln_quota)
         VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [parsed.id, parsed.org_id, parsed.name, parsed.rln_quota]
    );

    return result.rows[0];
  }

  async listChannels(orgId: string): Promise<ChannelRecord[]> {
    const result = await this.client.query<ChannelRecord>(
      `SELECT * FROM channel
         WHERE org_id = $1
       ORDER BY created_at DESC, name ASC`,
      [orgId]
    );

    return result.rows;
  }
}

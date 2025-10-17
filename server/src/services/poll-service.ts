import type { PoolClient } from "pg";
import { z } from "zod";

export type PollMode = "one" | "weighted";

export interface PollRecord {
  id: string;
  org_id: string;
  question: string;
  options: string[];
  mode: PollMode;
  start: Date | null;
  end: Date | null;
  tally: Record<string, unknown> | null;
  tally_proof: Record<string, unknown> | null;
}

type PollRow = Omit<PollRecord, "options" | "tally" | "tally_proof"> & {
  options: unknown;
  tally: unknown;
  tally_proof: unknown;
};

const pollInsertSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  mode: z.enum(["one", "weighted"]),
  start: z.date().nullable(),
  end: z.date().nullable()
});

export class PollService {
  constructor(private readonly client: PoolClient) {}

  async createPoll(input: {
    id: string;
    org_id: string;
    question: string;
    options: string[];
    mode: PollMode;
    start: Date | null;
    end: Date | null;
  }): Promise<PollRecord> {
    const parsed = pollInsertSchema.parse(input);

    const result = await this.client.query<PollRow>(
      `INSERT INTO poll (id, org_id, question, options, mode, start, "end")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        parsed.id,
        parsed.org_id,
        parsed.question,
        JSON.stringify(parsed.options),
        parsed.mode,
        parsed.start,
        parsed.end
      ]
    );

    return this.deserialize(result.rows[0]);
  }

  async listPolls(orgId: string): Promise<PollRecord[]> {
    const result = await this.client.query<PollRow>(
      `SELECT * FROM poll
         WHERE org_id = $1
       ORDER BY start NULLS LAST, id DESC`,
      [orgId]
    );

    return result.rows.map((row) => this.deserialize(row));
  }

  private deserialize(row: PollRow): PollRecord {
    const options = Array.isArray(row.options)
      ? (row.options as string[])
      : JSON.parse(String(row.options)) as string[];

    return {
      id: row.id,
      org_id: row.org_id,
      question: row.question,
      options,
      mode: row.mode,
      start: row.start,
      end: row.end,
      tally: (row.tally as Record<string, unknown> | null) ?? null,
      tally_proof: (row.tally_proof as Record<string, unknown> | null) ?? null
    };
  }
}

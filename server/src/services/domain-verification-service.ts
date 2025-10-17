import { randomBytes } from "node:crypto";
import type { PoolClient } from "pg";

export type DomainVerificationStatus = "pending" | "verified";

export interface DomainVerificationRecord {
  org_id: string;
  token: string;
  status: DomainVerificationStatus;
  verified_at: Date | null;
}

export class DomainVerificationService {
  constructor(private readonly client: PoolClient) {}

  async issueChallenge(orgId: string): Promise<DomainVerificationRecord> {
    const token = randomBytes(16).toString("hex");

    const result = await this.client.query<DomainVerificationRecord>(
      `INSERT INTO domain_verification (org_id, token, status)
         VALUES ($1, $2, 'pending')
         ON CONFLICT (org_id)
         DO UPDATE SET token = EXCLUDED.token, status = 'pending', verified_at = NULL
       RETURNING org_id, token, status, verified_at`,
      [orgId, token]
    );

    return result.rows[0];
  }

  async get(orgId: string): Promise<DomainVerificationRecord | null> {
    const result = await this.client.query<DomainVerificationRecord>(
      `SELECT org_id, token, status, verified_at
         FROM domain_verification
        WHERE org_id = $1`,
      [orgId]
    );

    return result.rows[0] ?? null;
  }

  async markVerified(orgId: string): Promise<DomainVerificationRecord | null> {
    const result = await this.client.query<DomainVerificationRecord>(
      `UPDATE domain_verification
          SET status = 'verified', verified_at = NOW()
        WHERE org_id = $1
      RETURNING org_id, token, status, verified_at`,
      [orgId]
    );

    return result.rows[0] ?? null;
  }
}

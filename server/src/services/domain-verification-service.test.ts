import { randomUUID } from "node:crypto";

import { newDb } from "pg-mem";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DomainVerificationService } from "./domain-verification-service.js";
import { OrgService } from "./org-service.js";

describe("DomainVerificationService", () => {
  let client: any;

  beforeEach(async () => {
    const db = newDb({ autoCreateForeignKeyIndices: true });
    const { Client } = db.adapters.createPg();
    client = new Client();
    await client.connect();

    await client.query(`
      CREATE TABLE org (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        domain TEXT NOT NULL UNIQUE,
        verification_modes JSONB NOT NULL,
        tree_root_current BYTEA NOT NULL,
        tree_roots_history JSONB,
        settings JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE domain_verification (
        org_id UUID PRIMARY KEY REFERENCES org(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        status TEXT NOT NULL,
        verified_at TIMESTAMPTZ
      );
    `);
  });

  afterEach(async () => {
    await client.end();
  });

  it("issues and refreshes challenges", async () => {
    const orgService = new OrgService(client);
    const domainService = new DomainVerificationService(client);

    const org = await orgService.createOrg({
      id: randomUUID(),
      name: "Acme",
      domain: "example.com",
      verification_modes: ["vc"],
      tree_root_current: Buffer.alloc(32),
      settings: {}
    });

    const first = await domainService.issueChallenge(org.id);
    expect(first.status).toBe("pending");
    expect(first.token).toHaveLength(32);

    const second = await domainService.issueChallenge(org.id);
    expect(second.token).toHaveLength(32);
    expect(second.token).not.toEqual(first.token);
    expect(second.status).toBe("pending");
  });

  it("marks challenges as verified", async () => {
    const orgService = new OrgService(client);
    const domainService = new DomainVerificationService(client);

    const org = await orgService.createOrg({
      id: randomUUID(),
      name: "Beta",
      domain: "beta.example",
      verification_modes: ["zkEmail"],
      tree_root_current: Buffer.alloc(32),
      settings: {}
    });

    await domainService.issueChallenge(org.id);
    const verified = await domainService.markVerified(org.id);

    expect(verified?.status).toBe("verified");
    expect(verified?.verified_at).toBeInstanceOf(Date);
  });
});

import { randomUUID } from "node:crypto";

import { newDb } from "pg-mem";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { OrgKeyService, type OrgKeyRecord } from "./org-key-service.js";
import { OrgService } from "./org-service.js";

describe("OrgKeyService", () => {
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
      CREATE TABLE org_key (
        org_id UUID PRIMARY KEY REFERENCES org(id) ON DELETE CASCADE,
        issuer_pubkeys JSONB NOT NULL DEFAULT '[]'::jsonb,
        dkim_keys JSONB NOT NULL DEFAULT '[]'::jsonb
      );
    `);
  });

  afterEach(async () => {
    await client.end();
  });

  it("upserts issuer and dkim keys", async () => {
    const orgService = new OrgService(client);
    const keyService = new OrgKeyService(client);

    const org = await orgService.createOrg({
      id: randomUUID(),
      name: "Acme",
      domain: "example.com",
      verification_modes: ["vc"],
      tree_root_current: Buffer.alloc(32),
      settings: {}
    });

    const first = await keyService.upsert(org.id, {
      issuer_pubkeys: [
        {
          kid: "issuer-key-1",
          jwk: { kty: "EC", crv: "P-256" },
          issuer: "https://idp.example.com"
        }
      ],
      dkim_keys: [
        {
          selector: "zksig",
          public_key: "MIIBIjANBgkqhkiG9w0BAQE...",
          domain: "example.com"
        }
      ]
    });

    expect(first.issuer_pubkeys).toHaveLength(1);
    expect(first.dkim_keys).toHaveLength(1);

    const second = await keyService.upsert(org.id, {
      issuer_pubkeys: [
        {
          kid: "issuer-key-2",
          jwk: { kty: "OKP", crv: "Ed25519" }
        }
      ],
      dkim_keys: []
    });

    expect(second.issuer_pubkeys[0].kid).toBe("issuer-key-2");
    expect(second.dkim_keys).toHaveLength(0);
  });

  it("returns null when keys missing", async () => {
    const keyService = new OrgKeyService(client);
    const record = await keyService.get(randomUUID());

    expect(record).toBeNull();
  });

  it("retrieves stored keys", async () => {
    const orgService = new OrgService(client);
    const keyService = new OrgKeyService(client);

    const org = await orgService.createOrg({
      id: randomUUID(),
      name: "Beta",
      domain: "beta.example",
      verification_modes: ["zkEmail"],
      tree_root_current: Buffer.alloc(32),
      settings: {}
    });

    await keyService.upsert(org.id, {
      issuer_pubkeys: [
        {
          kid: "issuer-key-3",
          jwk: { kty: "RSA", n: "abc", e: "AQAB" }
        }
      ]
    });

    const stored = await keyService.get(org.id);
    expect((stored as OrgKeyRecord).issuer_pubkeys[0].kid).toBe("issuer-key-3");
  });
});

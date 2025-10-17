import { randomUUID } from "node:crypto";

import { newDb } from "pg-mem";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ChannelService } from "./channel-service.js";
import { OrgService } from "./org-service.js";

describe("ChannelService", () => {
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
      CREATE TABLE channel (
        id UUID PRIMARY KEY,
        org_id UUID REFERENCES org(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        rln_quota INTEGER NOT NULL DEFAULT 10,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  });

  afterEach(async () => {
    await client.end();
  });

  it("creates and lists channels for an org", async () => {
    const orgService = new OrgService(client);
    const channelService = new ChannelService(client);

    const org = await orgService.createOrg({
      id: randomUUID(),
      name: "Acme Org",
      domain: "acme.test",
      verification_modes: ["vc"],
      tree_root_current: Buffer.alloc(32),
      settings: {}
    });

    await channelService.createChannel({
      id: randomUUID(),
      org_id: org.id,
      name: "general",
      rln_quota: 5
    });

    await channelService.createChannel({
      id: randomUUID(),
      org_id: org.id,
      name: "engineering",
      rln_quota: 10
    });

    const channels = await channelService.listChannels(org.id);

    expect(channels).toHaveLength(2);
    const names = channels.map((channel) => channel.name).sort();
    expect(names).toEqual(["engineering", "general"]);
  });
});

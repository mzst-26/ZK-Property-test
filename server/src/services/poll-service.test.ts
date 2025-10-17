import { randomUUID } from "node:crypto";

import { newDb } from "pg-mem";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { OrgService } from "./org-service.js";
import { PollService } from "./poll-service.js";

describe("PollService", () => {
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
      CREATE TABLE poll (
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
    `);
  });

  afterEach(async () => {
    await client.end();
  });

  it("creates polls and returns hydrated records", async () => {
    const orgService = new OrgService(client);
    const pollService = new PollService(client);

    const org = await orgService.createOrg({
      id: randomUUID(),
      name: "Beta Org",
      domain: "beta.test",
      verification_modes: ["zkEmail"],
      tree_root_current: Buffer.alloc(32),
      settings: {}
    });

    const start = new Date("2024-01-01T00:00:00.000Z");
    const end = new Date("2024-01-08T00:00:00.000Z");

    await pollService.createPoll({
      id: randomUUID(),
      org_id: org.id,
      question: "Adopt new policy?",
      options: ["yes", "no"],
      mode: "one",
      start,
      end
    });

    await pollService.createPoll({
      id: randomUUID(),
      org_id: org.id,
      question: "Preferred lunch day?",
      options: ["mon", "fri", "wed"],
      mode: "weighted",
      start: null,
      end: null
    });

    const polls = await pollService.listPolls(org.id);

    expect(polls).toHaveLength(2);
    const [first] = polls;
    expect(first.options).toContain("yes");
    expect(first.start).toBeInstanceOf(Date);
    expect(first.end).toBeInstanceOf(Date);
  });
});

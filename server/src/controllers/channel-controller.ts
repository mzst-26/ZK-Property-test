import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { pool } from "../db/pool.js";
import { ChannelService } from "../services/channel-service.js";
import { OrgService } from "../services/org-service.js";
import { logger } from "../utils/logger.js";

const channelBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  rln_quota: z.coerce
    .number()
    .int()
    .positive()
    .max(1000, "Quota too large")
    .default(10)
});

export async function createChannel(req: Request, res: Response): Promise<void> {
  const parsedBody = channelBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid channel payload",
      details: parsedBody.error.flatten().fieldErrors
    });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orgService = new OrgService(client);
    const channelService = new ChannelService(client);

    const org = await orgService.getOrgById(req.params.orgId);
    if (!org) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Org not found" });
      return;
    }

    const channel = await channelService.createChannel({
      id: randomUUID(),
      org_id: org.id,
      name: parsedBody.data.name,
      rln_quota: parsedBody.data.rln_quota
    });

    await client.query("COMMIT");

    res.status(201).json({ channel: serializeChannel(channel) });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Failed to create channel", error);
    res.status(500).json({ error: "Failed to create channel" });
  } finally {
    client.release();
  }
}

export async function listChannels(req: Request, res: Response): Promise<void> {
  const client = await pool.connect();

  try {
    const orgService = new OrgService(client);
    const channelService = new ChannelService(client);

    const org = await orgService.getOrgById(req.params.orgId);
    if (!org) {
      res.status(404).json({ error: "Org not found" });
      return;
    }

    const channels = await channelService.listChannels(org.id);
    res.json({ channels: channels.map(serializeChannel) });
  } catch (error) {
    logger.error("Failed to list channels", error);
    res.status(500).json({ error: "Failed to list channels" });
  } finally {
    client.release();
  }
}

function serializeChannel(channel: Awaited<ReturnType<ChannelService["createChannel"]>>) {
  return {
    id: channel.id,
    org_id: channel.org_id,
    name: channel.name,
    rln_quota: channel.rln_quota,
    created_at: channel.created_at.toISOString()
  };
}

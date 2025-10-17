import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";

import { pool } from "../db/pool.js";
import { OrgService } from "../services/org-service.js";
import { logger } from "../utils/logger.js";

export async function createOrg(req: Request, res: Response): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orgService = new OrgService(client);
    const id = randomUUID();
    const treeRoot = Buffer.from(req.body.tree_root_current ?? "", "hex");

    const org = await orgService.createOrg({
      id,
      name: req.body.name,
      domain: req.body.domain,
      verification_modes: req.body.verification_modes ?? [],
      tree_root_current: treeRoot.length ? treeRoot : Buffer.alloc(32),
      settings: req.body.settings ?? {}
    });

    await client.query("COMMIT");

    res.status(201).json({ org });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Failed to create org", error);
    res.status(500).json({ error: "Failed to create org" });
  } finally {
    client.release();
  }
}

export async function getOrg(req: Request, res: Response): Promise<void> {
  const client = await pool.connect();
  try {
    const orgService = new OrgService(client);
    const org = await orgService.getOrgByDomain(req.params.domain);

    if (!org) {
      res.status(404).json({ error: "Org not found" });
      return;
    }

    res.json({ org });
  } catch (error) {
    logger.error("Failed to fetch org", error);
    res.status(500).json({ error: "Failed to fetch org" });
  } finally {
    client.release();
  }
}

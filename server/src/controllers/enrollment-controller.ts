import type { Request, Response } from "express";

import { pool } from "../db/pool.js";
import { MembershipService } from "../services/membership-service.js";
import { OrgService } from "../services/org-service.js";
import { logger } from "../utils/logger.js";

export async function enrollMember(req: Request, res: Response): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const membershipService = new MembershipService(client);
    const orgService = new OrgService(client);

    const org = await orgService.getOrgByDomain(req.body.domain);
    if (!org) {
      res.status(404).json({ error: "Org not found" });
      return;
    }

    // Placeholder: verify proof payload and nullifier uniqueness
    const latestIndex = await membershipService.getLatestLeafIndex(org.id);
    const nextIndex = latestIndex + 1;

    await membershipService.insertMember({
      org_id: org.id,
      leaf_index: nextIndex,
      commitment: Buffer.from(req.body.member_commitment, "hex"),
      enrolled_at: new Date()
    });

    await orgService.updateTreeRoot(org.id, Buffer.from(req.body.new_tree_root, "hex"));

    await client.query("COMMIT");

    res.status(201).json({ leaf_index: nextIndex });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Failed to enroll member", error);
    res.status(500).json({ error: "Failed to enroll member" });
  } finally {
    client.release();
  }
}

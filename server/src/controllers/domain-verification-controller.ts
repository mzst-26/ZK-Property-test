import type { Request, Response } from "express";

import { pool } from "../db/pool.js";
import { DomainVerificationService } from "../services/domain-verification-service.js";
import { OrgService } from "../services/org-service.js";
import { buildDomainChallenge, verifyDomainTxtRecord } from "../utils/domain-verification.js";
import { logger } from "../utils/logger.js";

export async function requestDomainVerificationChallenge(
  req: Request,
  res: Response
): Promise<void> {
  const orgId = req.params.orgId;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orgService = new OrgService(client);
    const domainVerificationService = new DomainVerificationService(client);

    const org = await orgService.getOrgById(orgId);
    if (!org) {
      res.status(404).json({ error: "Org not found" });
      await client.query("ROLLBACK");
      return;
    }

    const verificationRecord = await domainVerificationService.issueChallenge(org.id);

    await client.query("COMMIT");

    res.status(201).json({
      domain_verification: buildDomainChallenge(org.domain, verificationRecord)
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Failed to issue domain verification challenge", error);
    res.status(500).json({ error: "Failed to issue domain verification challenge" });
  } finally {
    client.release();
  }
}

export async function verifyDomainOwnership(req: Request, res: Response): Promise<void> {
  const orgId = req.params.orgId;
  const client = await pool.connect();

  try {
    const orgService = new OrgService(client);
    const domainVerificationService = new DomainVerificationService(client);

    const org = await orgService.getOrgById(orgId);
    if (!org) {
      res.status(404).json({ error: "Org not found" });
      return;
    }

    const record = await domainVerificationService.get(org.id);
    if (!record) {
      res.status(400).json({ error: "No verification challenge found" });
      return;
    }

    const isVerified = await verifyDomainTxtRecord(org.domain, record.token);
    if (!isVerified) {
      res.status(409).json({
        error: "TXT record not found",
        expected: buildDomainChallenge(org.domain, record)
      });
      return;
    }

    const updated = await domainVerificationService.markVerified(org.id);
    if (!updated) {
      res.status(500).json({ error: "Failed to update verification status" });
      return;
    }

    res.json({
      domain_verification: buildDomainChallenge(org.domain, updated)
    });
  } catch (error) {
    logger.error("Failed to verify domain", error);
    res.status(500).json({ error: "Failed to verify domain" });
  } finally {
    client.release();
  }
}

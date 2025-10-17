import type { Request, Response } from "express";
import { z } from "zod";

import { pool } from "../db/pool.js";
import { DomainVerificationService } from "../services/domain-verification-service.js";
import {
  OrgKeyService,
  type DkimPublicKey,
  type IssuerPublicKey,
  type OrgKeyRecord
} from "../services/org-key-service.js";
import { OrgService } from "../services/org-service.js";
import { buildDomainChallenge } from "../utils/domain-verification.js";
import { logger } from "../utils/logger.js";

const upsertSchema = z
  .object({
    issuer_pubkeys: z
      .array(
        z.object({
          kid: z.string(),
          jwk: z.record(z.any()),
          issuer: z.string().optional()
        })
      )
      .optional(),
    dkim_keys: z
      .array(
        z.object({
          selector: z.string(),
          public_key: z.string(),
          domain: z.string().optional()
        })
      )
      .optional()
  })
  .strict();

export async function upsertOrgKeys(req: Request, res: Response): Promise<void> {
  const parseResult = upsertSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid payload",
      details: parseResult.error.flatten()
    });
    return;
  }

  const payload = parseResult.data;
  const issuerKeys: IssuerPublicKey[] = payload.issuer_pubkeys ?? [];
  const dkimKeys: DkimPublicKey[] = payload.dkim_keys ?? [];
  const orgId = req.params.orgId;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orgService = new OrgService(client);
    const orgKeyService = new OrgKeyService(client);
    const domainVerificationService = new DomainVerificationService(client);

    const org = await orgService.getOrgById(orgId);
    if (!org) {
      res.status(404).json({ error: "Org not found" });
      await client.query("ROLLBACK");
      return;
    }

    const verificationRecord = await domainVerificationService.get(org.id);
    if (!verificationRecord || verificationRecord.status !== "verified") {
      res.status(409).json({
        error: "Domain ownership not verified",
        domain_verification: verificationRecord
          ? buildDomainChallenge(org.domain, verificationRecord)
          : null
      });
      await client.query("ROLLBACK");
      return;
    }

    const record = await orgKeyService.upsert(org.id, {
      issuer_pubkeys: issuerKeys,
      dkim_keys: dkimKeys
    });

    await client.query("COMMIT");

    res.json({ org_keys: presentOrgKeys(record) });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Failed to update org keys", error);
    res.status(500).json({ error: "Failed to update org keys" });
  } finally {
    client.release();
  }
}

export async function getOrgKeys(req: Request, res: Response): Promise<void> {
  const orgId = req.params.orgId;
  const client = await pool.connect();

  try {
    const orgService = new OrgService(client);
    const orgKeyService = new OrgKeyService(client);

    const org = await orgService.getOrgById(orgId);
    if (!org) {
      res.status(404).json({ error: "Org not found" });
      return;
    }

    const record = await orgKeyService.get(org.id);

    res.json({
      org_keys: presentOrgKeys(record)
    });
  } catch (error) {
    logger.error("Failed to fetch org keys", error);
    res.status(500).json({ error: "Failed to fetch org keys" });
  } finally {
    client.release();
  }
}

function presentOrgKeys(record: OrgKeyRecord | null) {
  if (!record) {
    return { issuer_pubkeys: [], dkim_keys: [] };
  }

  return {
    issuer_pubkeys: record.issuer_pubkeys,
    dkim_keys: record.dkim_keys
  };
}

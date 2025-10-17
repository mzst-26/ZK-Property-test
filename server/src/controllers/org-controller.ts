import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";

import { pool } from "../db/pool.js";
import { DomainVerificationService } from "../services/domain-verification-service.js";
import { OrgKeyService, type OrgKeyRecord } from "../services/org-key-service.js";
import { OrgService, type OrgRecord } from "../services/org-service.js";
import { buildDomainChallenge } from "../utils/domain-verification.js";
import { logger } from "../utils/logger.js";

export async function createOrg(req: Request, res: Response): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orgService = new OrgService(client);
    const domainVerificationService = new DomainVerificationService(client);
    const orgKeyService = new OrgKeyService(client);
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

    const verificationRecord = await domainVerificationService.issueChallenge(org.id);

    await client.query("COMMIT");

    const keys = await orgKeyService.get(org.id);

    res.status(201).json({
      org: serializeOrg(org),
      domain_verification: buildDomainChallenge(org.domain, verificationRecord),
      org_keys: serializeOrgKeys(keys)
    });
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
    const domainVerificationService = new DomainVerificationService(client);
    const orgKeyService = new OrgKeyService(client);
    const org = await orgService.getOrgByDomain(req.params.domain);

    if (!org) {
      res.status(404).json({ error: "Org not found" });
      return;
    }

    const verificationRecord = await domainVerificationService.get(org.id);

    const keys = await orgKeyService.get(org.id);

    res.json({
      org: serializeOrg(org),
      domain_verification: verificationRecord
        ? buildDomainChallenge(org.domain, verificationRecord)
        : null,
      org_keys: serializeOrgKeys(keys)
    });
  } catch (error) {
    logger.error("Failed to fetch org", error);
    res.status(500).json({ error: "Failed to fetch org" });
  } finally {
    client.release();
  }
}

function serializeOrg(org: OrgRecord) {
  const verificationModes = Array.isArray(org.verification_modes)
    ? org.verification_modes
    : parseJsonValue<OrgRecord["verification_modes"]>(org.verification_modes as unknown, []);
  const treeRootsHistory = Array.isArray(org.tree_roots_history)
    ? org.tree_roots_history
    : parseJsonValue<unknown[]>(org.tree_roots_history as unknown, []);
  const settings =
    org.settings && typeof org.settings === "object"
      ? org.settings
      : parseJsonValue<Record<string, unknown>>(org.settings as unknown, {});

  return {
    id: org.id,
    name: org.name,
    domain: org.domain,
    verification_modes: verificationModes,
    tree_root_current: org.tree_root_current.toString("hex"),
    tree_roots_history: treeRootsHistory,
    settings,
    created_at: org.created_at.toISOString()
  };
}

function serializeOrgKeys(record: OrgKeyRecord | null) {
  return {
    issuer_pubkeys: record?.issuer_pubkeys ?? [],
    dkim_keys: record?.dkim_keys ?? []
  };
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      return fallback;
    }
  }

  return value as T;
}

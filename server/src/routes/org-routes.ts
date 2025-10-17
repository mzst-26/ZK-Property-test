import { Router } from "express";

import { createOrg, getOrg } from "../controllers/org-controller.js";
import {
  requestDomainVerificationChallenge,
  verifyDomainOwnership
} from "../controllers/domain-verification-controller.js";
import {
  getOrgKeys,
  upsertOrgKeys
} from "../controllers/org-key-controller.js";

export const orgRouter = Router();

orgRouter.post("/", createOrg);
orgRouter.post("/:orgId/verification/challenge", requestDomainVerificationChallenge);
orgRouter.post("/:orgId/verification/check", verifyDomainOwnership);
orgRouter.get("/:orgId/keys", getOrgKeys);
orgRouter.put("/:orgId/keys", upsertOrgKeys);
orgRouter.get("/:domain", getOrg);

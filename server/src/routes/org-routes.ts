import { Router } from "express";

import { createOrg, getOrg } from "../controllers/org-controller.js";
import {
  requestDomainVerificationChallenge,
  verifyDomainOwnership
} from "../controllers/domain-verification-controller.js";

export const orgRouter = Router();

orgRouter.post("/", createOrg);
orgRouter.post("/:orgId/verification/challenge", requestDomainVerificationChallenge);
orgRouter.post("/:orgId/verification/check", verifyDomainOwnership);
orgRouter.get("/:domain", getOrg);

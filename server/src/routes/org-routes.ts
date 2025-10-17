import { Router } from "express";

import { createChannel, listChannels } from "../controllers/channel-controller.js";
import { createOrg, getOrg } from "../controllers/org-controller.js";
import {
  requestDomainVerificationChallenge,
  verifyDomainOwnership
} from "../controllers/domain-verification-controller.js";
import { createPoll, listPolls } from "../controllers/poll-controller.js";

export const orgRouter = Router();

orgRouter.post("/", createOrg);
orgRouter.post("/:orgId/verification/challenge", requestDomainVerificationChallenge);
orgRouter.post("/:orgId/verification/check", verifyDomainOwnership);
orgRouter.post("/:orgId/channels", createChannel);
orgRouter.get("/:orgId/channels", listChannels);
orgRouter.post("/:orgId/polls", createPoll);
orgRouter.get("/:orgId/polls", listPolls);
orgRouter.get("/:domain", getOrg);

import { Router } from "express";

import { createOrg, getOrg } from "../controllers/org-controller.js";

export const orgRouter = Router();

orgRouter.post("/", createOrg);
orgRouter.get("/:domain", getOrg);

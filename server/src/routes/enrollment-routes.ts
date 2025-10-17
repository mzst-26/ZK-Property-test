import { Router } from "express";

import { enrollMember } from "../controllers/enrollment-controller.js";

export const enrollmentRouter = Router();

enrollmentRouter.post("/", enrollMember);

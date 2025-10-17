import { Queue } from "bullmq";

import { env } from "../config/env.js";

export interface ProofJob {
  type: "enroll" | "signal" | "vote";
  orgId: string;
  payload: Record<string, unknown>;
}

export const proofQueue = new Queue<ProofJob>("proof-jobs", {
  connection: env.REDIS_URL
    ? { url: env.REDIS_URL }
    : undefined
});

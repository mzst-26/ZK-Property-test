import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { pool } from "../db/pool.js";
import { OrgService } from "../services/org-service.js";
import { PollService } from "../services/poll-service.js";
import { logger } from "../utils/logger.js";

const pollBodySchema = z
  .object({
    question: z.string().trim().min(1, "Question is required"),
    options: z
      .array(z.string().trim().min(1))
      .min(2, "At least two options are required"),
    mode: z.enum(["one", "weighted"]).default("one"),
    start: z
      .union([z.string().datetime(), z.coerce.date()])
      .optional()
      .transform((value) => (value ? new Date(value) : undefined)),
    end: z
      .union([z.string().datetime(), z.coerce.date()])
      .optional()
      .transform((value) => (value ? new Date(value) : undefined))
  })
  .superRefine((value, ctx) => {
    if (value.start && Number.isNaN(value.start.getTime())) {
      ctx.addIssue({
        path: ["start"],
        code: z.ZodIssueCode.custom,
        message: "Invalid start timestamp"
      });
    }

    if (value.end && Number.isNaN(value.end.getTime())) {
      ctx.addIssue({
        path: ["end"],
        code: z.ZodIssueCode.custom,
        message: "Invalid end timestamp"
      });
    }

    if (value.start && value.end && value.end <= value.start) {
      ctx.addIssue({
        path: ["end"],
        code: z.ZodIssueCode.custom,
        message: "End must be after start"
      });
    }
  });

export async function createPoll(req: Request, res: Response): Promise<void> {
  const parsedBody = pollBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid poll payload",
      details: parsedBody.error.flatten().fieldErrors
    });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orgService = new OrgService(client);
    const pollService = new PollService(client);
    const org = await orgService.getOrgById(req.params.orgId);

    if (!org) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Org not found" });
      return;
    }

    const poll = await pollService.createPoll({
      id: randomUUID(),
      org_id: org.id,
      question: parsedBody.data.question,
      options: parsedBody.data.options,
      mode: parsedBody.data.mode,
      start: parsedBody.data.start ?? null,
      end: parsedBody.data.end ?? null
    });

    await client.query("COMMIT");

    res.status(201).json({ poll: serializePoll(poll) });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Failed to create poll", error);
    res.status(500).json({ error: "Failed to create poll" });
  } finally {
    client.release();
  }
}

export async function listPolls(req: Request, res: Response): Promise<void> {
  const client = await pool.connect();

  try {
    const orgService = new OrgService(client);
    const pollService = new PollService(client);

    const org = await orgService.getOrgById(req.params.orgId);
    if (!org) {
      res.status(404).json({ error: "Org not found" });
      return;
    }

    const polls = await pollService.listPolls(org.id);

    res.json({ polls: polls.map(serializePoll) });
  } catch (error) {
    logger.error("Failed to list polls", error);
    res.status(500).json({ error: "Failed to list polls" });
  } finally {
    client.release();
  }
}

function serializePoll(poll: Awaited<ReturnType<PollService["createPoll"]>>) {
  return {
    id: poll.id,
    org_id: poll.org_id,
    question: poll.question,
    options: poll.options,
    mode: poll.mode,
    start: poll.start ? poll.start.toISOString() : null,
    end: poll.end ? poll.end.toISOString() : null,
    tally: poll.tally,
    tally_proof: poll.tally_proof
  };
}

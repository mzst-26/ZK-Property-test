import cors from "cors";
import express from "express";
import "express-async-errors";

import { enrollmentRouter } from "./routes/enrollment-routes.js";
import { orgRouter } from "./routes/org-routes.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.use("/orgs", orgRouter);
  app.use("/enrollments", enrollmentRouter);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}

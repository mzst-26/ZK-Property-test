import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { logger } from "./utils/logger.js";

const app = createApp();

app.listen(Number(env.PORT), () => {
  logger.info(`API listening on port ${env.PORT}`);
});

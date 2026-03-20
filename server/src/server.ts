import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
import express from "express";
import cors from "cors";
import logger from "./logger.js";
import chatRouter from "./routes/chat.js";
import streamRouter from "./routes/stream.js";
import { initAgent } from "./agent/agent.js";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(chatRouter);
app.use(streamRouter);

async function start() {
  await initAgent();
  app.listen(PORT, () => {
    logger.info(`Server listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});

export default app;

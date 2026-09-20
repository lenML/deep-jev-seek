import { startServer } from "./app";

try {
  startServer();
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown startup error";
  console.error(`[jevseek-server] startup failed: ${message}`);
  process.exitCode = 1;
}

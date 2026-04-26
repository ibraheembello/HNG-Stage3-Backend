import { buildApp } from './app';
import { env } from './config/env';
import { log } from './middleware/logger';

const app = buildApp();

const server = app.listen(env.PORT, () => {
  log.info(`Insighta Labs+ API listening on :${env.PORT} (${env.NODE_ENV})`);
});

const shutdown = (signal: string) => {
  log.info(`Received ${signal}, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

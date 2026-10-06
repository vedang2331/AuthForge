import { app } from './app.js';
import { config } from './config/index.js';
import { logger } from './logging/logger.js';
import { prisma } from './repositories/prisma.js';

const server = app.listen(config.port, () => {
  logger.info(`🚀 AuthForge Platform listening on port ${config.port} (${config.env} mode)`);
  logger.info(`📖 OpenAPI / Swagger Docs available at http://localhost:${config.port}/api-docs`);
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    await prisma.$disconnect();
    logger.info('PostgreSQL connection pool closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

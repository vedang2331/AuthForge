import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/index.js';
import { swaggerSpec } from './config/swagger.js';
import { requestIdMiddleware } from './middleware/requestId.middleware.js';
import { httpLoggerMiddleware } from './middleware/httpLogger.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { gatewayMiddleware } from './gateway/proxy.js';
import apiRouter from './routes/index.js';
import { prisma } from './repositories/prisma.js';
import { redis } from './cache/redis.js';
import { sendSuccess } from './utils/response.js';

export const app: Express = express();

// Security & Base Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Observability Middleware
app.use(requestIdMiddleware);
app.use(httpLoggerMiddleware);

// Health Check Endpoints
app.get('/health', (req: Request, res: Response) => {
  sendSuccess(res, { status: 'UP', service: 'AuthForge', timestamp: new Date().toISOString() });
});

app.get('/ready', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.get('health_ping');
    sendSuccess(res, { status: 'READY', database: 'HEALTHY', redis: 'HEALTHY' });
  } catch (error: any) {
    res.status(503).json({ status: 'UNHEALTHY', error: error.message });
  }
});

// Swagger UI Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Core Platform API Routes
app.use(config.apiPrefix, apiRouter);

// API Gateway Proxy Handler (/gateway/*)
app.use('/gateway', gatewayMiddleware);

// Centralized Error Handler
app.use(errorHandler);

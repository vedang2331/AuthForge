import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AuthForge - Secure Authentication & API Gateway Platform',
      version: '1.0.0',
      description:
        'Centralized IAM and API Gateway Platform built with TypeScript, Node.js, Express, PostgreSQL, and Redis.\n\nProvides JWT authentication, Refresh Token rotation with reuse detection, granular RBAC, hashed API keys, sliding-window rate limiting, structured audit logging, and dynamic reverse-proxy routing.',
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter short-lived JWT Access Token',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'Enter raw API key (e.g. af_live_123.abc...)',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
      {
        ApiKeyAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/app.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',

  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/authforge?schema=public',

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'authforge_super_secret_access_key_32bytes',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m', // e.g. 15m
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'authforge_super_secret_refresh_key_32bytes',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d', // e.g. 7d
  },

  rateLimit: {
    loginMax: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '5', 10),
    loginWindowSec: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_SEC || '60', 10),
    apiMax: parseInt(process.env.RATE_LIMIT_API_MAX || '100', 10),
    apiWindowSec: parseInt(process.env.RATE_LIMIT_API_WINDOW_SEC || '60', 10),
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock-google-client-secret',
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/v1/auth/oauth/google/callback',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || 'mock-github-client-id',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'mock-github-client-secret',
      callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:4000/api/v1/auth/oauth/github/callback',
    },
  },

  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173').split(','),
  },
};

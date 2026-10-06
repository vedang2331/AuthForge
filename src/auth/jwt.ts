import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UnauthorizedError } from '../utils/errors.js';

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  sid: string;
  [key: string]: any;
}

export function signAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  const options: SignOptions = {
    expiresIn: config.jwt.accessExpiration as any,
  };
  return jwt.sign(payload, config.jwt.accessSecret, options);
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired access token', 'TOKEN_INVALID');
  }
}

export function signRefreshToken(payload: { sub: string; sid: string; familyId: string }): string {
  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiration as any,
  };
  return jwt.sign(payload, config.jwt.refreshSecret, options);
}

export function verifyRefreshToken(token: string): { sub: string; sid: string; familyId: string } {
  try {
    return jwt.verify(token, config.jwt.refreshSecret) as { sub: string; sid: string; familyId: string };
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token', 'REFRESH_TOKEN_INVALID');
  }
}

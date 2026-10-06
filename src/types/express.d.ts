import { JwtPayload } from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  role: string;
  permissions: string[];
}

export interface AuthApiKey {
  id: string;
  userId: string;
  name: string;
  keyIdentifier: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: AuthUser;
      sessionId?: string;
      apiKey?: AuthApiKey;
      tokenPayload?: JwtPayload;
    }
  }
}

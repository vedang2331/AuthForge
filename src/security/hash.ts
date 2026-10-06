import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateRandomToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function generateApiKey(): { keyIdentifier: string; secret: string; fullKey: string; keySecretHash: string } {
  const prefix = 'af_live';
  const identifier = `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
  const secret = crypto.randomBytes(24).toString('hex');
  const fullKey = `${identifier}.${secret}`;
  const keySecretHash = hashToken(fullKey);

  return {
    keyIdentifier: identifier,
    secret,
    fullKey,
    keySecretHash,
  };
}

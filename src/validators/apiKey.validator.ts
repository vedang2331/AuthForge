import { z } from 'zod';

export const createApiKeySchema = z.object({
  name: z.string().min(1, 'API Key name is required').max(100),
  permissions: z.array(z.string()).min(1, 'At least one permission scope must be specified'),
  expiresInDays: z.number().int().positive().optional(),
});

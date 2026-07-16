import type { CompanyUser } from '../modules/prisma/generated/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        sessionId: string;
        twoFactorEnabled: boolean;
      };
      membership?: CompanyUser;
    }
  }
}

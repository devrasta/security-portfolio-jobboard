// src/modules/security/decorators/current-user.decorator.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CurrentUser Decorator
 *
 * Extracts authenticated user from request object.
 * User is attached by JwtAuthGuard after token validation.
 *
 * Usage:
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * async getProfile(@CurrentUser() user: JwtPayload) {
 *   return user;
 * }
 *
 * Available fields:
 * - userId: string
 * - email: string
 * - role: UserRole
 * - sessionId: string
 * - emailVerified: boolean
 * - twoFactorEnabled: boolean
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

/**
 * Type definition for CurrentUser decorator
 */
export interface JwtPayload {
  userId: string;
  email: string;
  sessionId?: string;
  twoFactorEnabled?: boolean;
}

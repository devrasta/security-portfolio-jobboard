import { Controller, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '@/modules/security/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/security/decorators/current-user.decorator';
import type { JwtPayload } from '@/modules/security/decorators/current-user.decorator';

@SkipThrottle({ default: true, loginByEmail: true })
@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  async getActiveSessions(@CurrentUser() user: JwtPayload) {
    return this.sessionsService.getActiveSessions(user.userId);
  }

  @Delete(':id')
  async revokeSession(
    @CurrentUser() user: JwtPayload,
    @Param('id') sessionId: string,
  ) {
    return this.sessionsService.revokeSession(sessionId, user.userId);
  }
}

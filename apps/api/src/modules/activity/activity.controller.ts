import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '@/modules/security/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/security/decorators/current-user.decorator';
import type { JwtPayload } from '@/modules/security/decorators/current-user.decorator';
import { ActivityAction } from '@/modules/prisma/generated/client';

@SkipThrottle({ default: true, loginByEmail: true })
@Controller('activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  async getActivityLogs(
    @CurrentUser() user: JwtPayload,
    @Query('action') action?: ActivityAction,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.activityService.getActivityLogs({
      userId: user.userId,
      action,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get('recent')
  async getRecentActivity(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
  ) {
    return this.activityService.getRecentActivity(
      user.userId,
      limit ? parseInt(limit) : 10,
    );
  }
}

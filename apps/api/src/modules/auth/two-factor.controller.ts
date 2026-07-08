import {
  Controller,
  Get,
  Post,
  UseGuards,
  Body,
  HttpStatus,
  HttpCode,
  Req,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { TwoFactorService } from './two-factor.service';
import { CurrentUser } from '../security/decorators/current-user.decorator';
import { JwtAuthGuard } from '../security/guards/jwt-auth.guard';
import { Enable2FADto } from './dto/enable-2fa.dto';
import { Disable2FADto } from './dto/disable-2fa.dto';
import type { Request } from 'express';
import { ActivityService } from '../activity/activity.service';

@Controller('auth/2fa')
export class TwoFactorController {
  constructor(
    private twoFactorService: TwoFactorService,
    private activityService: ActivityService,
  ) {}

  @Get('setup')
  @UseGuards(JwtAuthGuard)
  async setup(@CurrentUser('userId') userId: string) {
    console.log('Generating 2FA secret for user:', userId);
    const { secret, qrCode } =
      await this.twoFactorService.generateSecret(userId);
    return { secret, qrCode };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Post('enable')
  async enable(
    @Body() enableDto: Enable2FADto,
    @CurrentUser('userId') userId: string,
    @Req() req: Request,
  ) {
    const enable2fa = await this.twoFactorService.enableTwoFactor(
      userId,
      enableDto.code,
    );
    await this.activityService.logActivity({
      action: 'TWO_FACTOR_ENABLED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user ? req.user['userId'] : null,
    });
    return enable2fa;
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle({ default: true, loginByEmail: true })
  async status(@CurrentUser('userId') userId: string) {
    const isEnabled = await this.twoFactorService.isTwoFactorEnabled(userId);
    return { isEnabled };
  }

  @HttpCode(HttpStatus.OK)
  @Post('disable')
  @UseGuards(JwtAuthGuard)
  async disable(
    @Body() disableDto: Disable2FADto,
    @CurrentUser('userId') userId: string,
    @Req() req: Request,
  ) {
    await this.twoFactorService.disableTwoFactor(userId, disableDto.code);
    await this.activityService.logActivity({
      action: 'TWO_FACTOR_DISABLED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user ? req.user['userId'] : null,
    });
    return { message: 'Two-factor authentication disabled' };
  }
}

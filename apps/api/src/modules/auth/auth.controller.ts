import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService, ILoginSuccess } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { Request, Response } from 'express';
import { ActivityService } from '../activity/activity.service';
import { JwtAuthGuard } from '../security/guards/jwt-auth.guard';
import { MailThrottlerGuard } from './mail-throttler.guard';
import { ChangePasswordDto } from './dto/changePassword.dto';
import { CryptoService } from '../security/crypto.service';
import { ValidationService } from '../security/validation.service';
import { Throttle, hours, days, minutes } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private activityService: ActivityService,
    private cryptoService: CryptoService,
    private validationService: ValidationService,
  ) {}

  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: hours(1), limit: 5 } })
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { ttl: minutes(1), limit: 120 },
    loginByEmail: { ttl: minutes(1), limit: 120 },
  })
  @Post('password-strength')
  checkPasswordStrength(@Body('password') password: string) {
    return { strength: this.validationService.getPasswordStrength(password) };
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(MailThrottlerGuard)
  @Post('login')
  async logIn(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceInfo = {
      deviceId: crypto.randomUUID(),
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
    try {
      const loginResponse = await this.authService.login(loginDto, deviceInfo);

      if (loginResponse.hasOwnProperty('twoFactorRequired')) {
        return loginResponse;
      }
      const { accessToken, refreshToken, user } =
        loginResponse as ILoginSuccess;

      await this.activityService.logActivity({
        action: 'LOGIN_SUCCESS',
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.cookie('refreshToken', this.cryptoService.encrypt(refreshToken), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: days(7),
      });
      return { accessToken, user };
    } catch (error) {
      await this.activityService.logActivity({
        action: 'LOGIN_FAILURE',
        userId: null,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      throw error;
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const encryptedToken = req.cookies['refreshToken'];

    if (!encryptedToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const refreshToken = this.cryptoService.decrypt(encryptedToken);
    const tokens = await this.authService.refresh(refreshToken);

    res.cookie(
      'refreshToken',
      this.cryptoService.encrypt(tokens.refreshToken),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: days(7),
      },
    );
    await this.activityService.logActivity({
      action: 'TOKEN_REFRESH',
      userId: tokens.user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return {
      accessToken: tokens.accessToken,
      user: tokens.user,
    };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    const userId = req.user['sub'];
    await this.authService.changePassword({
      userId,
      currentPassword: changePasswordDto.currentPassword,
      newPassword: changePasswordDto.newPassword,
    });

    await this.activityService.logActivity({
      action: 'PASSWORD_CHANGE',
      userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { message: 'Password changed successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logOut(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const encryptedToken = req.cookies['refreshToken'];

    if (encryptedToken) {
      const refreshToken = this.cryptoService.decrypt(encryptedToken);
      await this.authService.logout(refreshToken);
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
    });
    await this.activityService.logActivity({
      action: 'LOGOUT',
      userId: req.user ? req.user['userId'] : null,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { message: 'Logged out successfully' };
  }

  @HttpCode(HttpStatus.OK)
  @Post('login/2fa')
  async loginWith2FA(
    @Body() body: { accessToken: string; code: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.authService.loginWith2FA(
        body.accessToken,
        body.code,
      );

      await this.activityService.logActivity({
        action: 'LOGIN_SUCCESS',
        userId: result.user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.cookie(
        'refreshToken',
        this.cryptoService.encrypt(result.refreshToken),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'none',
          maxAge: days(7),
        },
      );

      return { accessToken: result.accessToken, user: result.user };
    } catch (error) {
      await this.activityService.logActivity({
        action: 'LOGIN_FAILURE',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        userId: req.user ? req.user['userId'] : null,
      });
      throw error;
    }
  }
}

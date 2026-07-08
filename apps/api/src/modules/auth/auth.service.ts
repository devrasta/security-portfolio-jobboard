import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '@/modules/users/users.service';
import { HashService } from '@/modules/security/hash.service';
import { TokenService } from '@/modules/security/token.service';
import { ValidationService } from '@/modules/security/validation.service';
import { JwtManagerService } from '@/modules/security/jwtManager.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TwoFactorService } from './two-factor.service';

export interface ILoginSuccess {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string };
}

export interface ILoginTwoFactorChallenge {
  accessToken: string;
  twoFactorRequired: boolean;
}

interface IRefreshTokenPayload {
  userId: string;
  tokenFamily: string;
  deviceInfo?: {
    deviceId?: string;
    userAgent?: string | string[];
    ipAddress?: string;
  };
}
interface IDeviceInfo {
  deviceId: string;
  userAgent: string | string[];
  ipAddress: string;
}
@Injectable()
export class AuthService {
  constructor(
    private readonly twoFactorService: TwoFactorService,
    private hashService: HashService,
    private jwtService: JwtManagerService,
    private validationService: ValidationService,
    private tokenService: TokenService,
    private usersService: UsersService,
    private prisma: PrismaService,
  ) {}

  async register(dto: RegisterDto) {
    if (!this.validationService.isValidEmail(dto.email)) {
      throw new BadRequestException('Invalid email');
    }
    const passStrength = this.validationService.getPasswordStrength(
      dto.password,
    );
    console.log('Password strength check:', passStrength);
    if (passStrength < 4) {
      const passStrength = this.validationService.getPasswordStrength(
        dto.password,
      );
      throw new BadRequestException({
        message: 'Weak password',
        strength: passStrength,
      });
    }

    const hashedPassword = await this.hashService.hashPassword(dto.password);

    const verificationToken = this.tokenService.generateVerificationToken();

    return this.usersService.createUser({
      ...dto,
      password: hashedPassword,
      emailVerificationToken: verificationToken,
    });
  }

  async login(
    loginParams: LoginDto,
    deviceInfo?: IDeviceInfo,
  ): Promise<ILoginSuccess | ILoginTwoFactorChallenge> {
    const tokenFamily = crypto.randomUUID();
    const user = await this.usersService.findByEmail(loginParams.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await this.hashService.verifyPassword(
      user.password,
      loginParams.password,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isTwoFactorEnabled = await this.twoFactorService.isTwoFactorEnabled(
      user.id,
    );
    console.log('User 2FA status:', isTwoFactorEnabled);
    if (isTwoFactorEnabled) {
      const accessToken = this.jwtService.generateAccessToken({
        userId: user.id,
        email: user.email,
      });
      return { accessToken, twoFactorRequired: true };
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.generateAccessToken({
        userId: user.id,
        email: user.email,
      }),
      this.generateRefreshToken({
        userId: user.id,
        tokenFamily,
        deviceInfo: deviceInfo || ({} as IDeviceInfo),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name },
    };
  }

  async generateRefreshToken({
    userId,
    tokenFamily,
    deviceInfo,
  }: IRefreshTokenPayload) {
    return this.jwtService.generateRefreshToken(userId, tokenFamily, {
      deviceId: deviceInfo?.deviceId,
      userAgent: Array.isArray(deviceInfo?.userAgent)
        ? deviceInfo.userAgent.join(', ')
        : deviceInfo?.userAgent,
      ipAddress: deviceInfo?.ipAddress,
    });
  }

  async verifyRefreshToken(token: string) {
    const { userId, tokenFamily, jti } =
      await this.jwtService.verifyRefreshToken(token);

    const user = await this.usersService.findById(userId);

    return { user, tokenFamily, jti };
  }

  async refresh(refreshToken: string) {
    const { user, tokenFamily, jti } =
      await this.verifyRefreshToken(refreshToken);

    await this.prisma.refreshToken.update({
      where: { jti },
      data: { isRevoked: true },
    });

    const [newAccessToken, newRefreshToken] = await Promise.all([
      this.jwtService.generateAccessToken({
        userId: user.id,
        email: user.email,
      }),
      this.generateRefreshToken({ userId: user.id, tokenFamily }),
    ]);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  async logout(refreshToken: string) {
    const { jti } = await this.verifyRefreshToken(refreshToken);

    await this.prisma.refreshToken.update({
      where: { jti },
      data: { isRevoked: true },
    });
  }

  async changePassword(changePasswordParams: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }) {
    const { userId, currentPassword, newPassword } = changePasswordParams;
    const user = await this.usersService.findById(userId);
    const isValid = await this.hashService.verifyPassword(
      user.password,
      currentPassword,
    );

    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedNewPassword = await this.hashService.hashPassword(newPassword);

    await this.usersService.updatePassword(userId, hashedNewPassword);
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  async loginWith2FA(
    temporaryToken: string,
    twoFactorCode: string,
  ): Promise<ILoginSuccess> {
    let payload: any;
    try {
      payload = this.jwtService.verifyAccessToken(temporaryToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired temporary token');
    }

    const isValid = await this.twoFactorService.verifyCode(
      payload.sub,
      twoFactorCode,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    const tokenFamily = crypto.randomUUID();
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.generateAccessToken({
        userId: user.id,
        email: user.email,
      }),
      this.generateRefreshToken({
        userId: user.id,
        tokenFamily,
        deviceInfo: {} as IDeviceInfo,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name },
    };
  }
}

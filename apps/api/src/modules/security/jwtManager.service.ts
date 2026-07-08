import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { HashService } from './hash.service';

interface JwtPayload {
  userId: string;
  email: string;
  jti?: string;
}

@Injectable()
export class JwtManagerService {
  constructor(
    private readonly nestJwtService: NestJwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly hashService: HashService,
  ) {}

  generateAccessToken(payload: JwtPayload): string {
    return this.nestJwtService.sign(
      { sub: payload.userId, email: payload.email },
      {
        expiresIn: this.config.get('JWT_EXPIRES_IN'),
        secret: this.config.get('JWT_SECRET'),
      },
    );
  }

  async generateRefreshToken(
    userId: string,
    tokenFamily: string,
    deviceInfo?: { deviceId?: string; userAgent?: string; ipAddress?: string },
  ) {
    const jti = crypto.randomBytes(16).toString('hex');

    const refreshToken = await this.nestJwtService.signAsync(
      {
        sub: userId,
        type: 'refresh',
        jti,
        family: tokenFamily,
      },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        jti,
        userId,
        token: this.hashService.hashToken(refreshToken),
        tokenFamily,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: false,
        deviceId: deviceInfo?.deviceId,
        userAgent: deviceInfo?.userAgent,
        ipAddress: deviceInfo?.ipAddress,
      },
    });

    return refreshToken;
  }

  verifyAccessToken(token: string): JwtPayload {
    return this.nestJwtService.verify(token, {
      secret: this.config.get('JWT_SECRET'),
    });
  }

  async verifyRefreshToken(token: string) {
    // Vérifie le JWT
    const decoded = await this.nestJwtService.verifyAsync(token, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    // Vérifie en DB
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { jti: decoded.jti },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Token not found');
    }

    if (storedToken.isRevoked) {
      await this.revokeTokenFamily(storedToken.tokenFamily);
      throw new UnauthorizedException('Token theft detected');
    }

    return {
      userId: decoded.sub,
      tokenFamily: decoded.family,
      jti: decoded.jti,
    };
  }

  async revokeTokenFamily(tokenFamily: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenFamily },
      data: { isRevoked: true },
    });
  }
}

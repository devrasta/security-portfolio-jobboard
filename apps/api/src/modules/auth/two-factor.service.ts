import { BadRequestException, Injectable } from '@nestjs/common';
import { generateSecret, generateURI, verify } from 'otplib';
import { toDataURL } from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { HashService } from '../security/hash.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class TwoFactorService {
  constructor(
    private prisma: PrismaService,
    private hashService: HashService,
    private userService: UsersService,
  ) {}

  generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = this.hashService.generateSecureToken(4);
      codes.push(code);
    }
    return codes;
  }
  async generateSecret(
    userId: string,
  ): Promise<{ secret: string; qrCode: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) {
      throw new Error('User not found');
    }
    const secret = generateSecret();
    const qrCode = await toDataURL(
      generateURI({
        issuer: 'Auth Secure System overstand',
        label: user.email,
        secret,
        strategy: 'totp',
      }),
    );
    await this.prisma.twoFactorSecret.upsert({
      where: { userId },
      update: { secret, isEnabled: false },
      create: { userId, secret, isEnabled: false, backupCodes: [] },
    });

    return { secret, qrCode };
  }

  async enableTwoFactor(
    userId: string,
    token: string,
  ): Promise<{ backupCodes: string[] }> {
    const twoFactorSecret = await this.prisma.twoFactorSecret.findUnique({
      where: { userId },
    });

    if (!twoFactorSecret) {
      throw new BadRequestException(
        '2FA not initialized. Generate secret first.',
      );
    }

    await this.userService.toggleTwoFactor(userId, true);

    const result = await verify({
      secret: twoFactorSecret.secret,
      token,
    });

    if (!result.valid) {
      throw new BadRequestException('Invalid 2FA code');
    }
    const backupCodes = this.generateBackupCodes(10);

    const hashedCodes = await Promise.all(
      backupCodes.map((code) => this.hashService.hashPassword(code)),
    );

    await this.prisma.twoFactorSecret.update({
      where: { userId },
      data: {
        isEnabled: true,
        backupCodes: hashedCodes,
      },
    });
    
    return { backupCodes };
  }

  async verifyCode(userId: string, token: string): Promise<boolean> {
    const twoFactorSecret = await this.prisma.twoFactorSecret.findUnique({
      where: { userId, isEnabled: true },
    });

    if (!twoFactorSecret) {
      return false;
    }

    if (token.length === 6) {
      const verifyResult = await verify({
        secret: twoFactorSecret.secret,
        token,
      });
      return verifyResult.valid;
    } else if (token.length === 8 && /^[A-F0-9]{8}$/i.test(token)) {
      return this.verifyBackupCode(userId, token.toUpperCase());
    }
    return false;
  }

  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const twoFactorSecret = await this.prisma.twoFactorSecret.findUnique({
      where: { userId, isEnabled: true },
      select: { backupCodes: true },
    });

    if (!twoFactorSecret) {
      return false;
    }

    const isBackupCodeValid = twoFactorSecret.backupCodes.some((hashedCode) =>
      this.hashService.verifyPassword(hashedCode, code),
    );

    return isBackupCodeValid;
  }

  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    const twoFactorSecret = await this.prisma.twoFactorSecret.findUnique({
      where: { userId, isEnabled: true },
    });

    return !!twoFactorSecret;
  }

  async disableTwoFactor(userId: string, token: string): Promise<void> {
    const twoFactorSecret = await this.prisma.twoFactorSecret.findUnique({
      where: { userId, isEnabled: true },
    });

    if (!twoFactorSecret) {
      throw new BadRequestException('2FA is not enabled');
    }

    const isValid = await this.verifyCode(userId, token);

    if (!isValid) {
      throw new BadRequestException('Invalid 2FA code');
    }

    this.userService.toggleTwoFactor(userId, false);

    await this.prisma.twoFactorSecret.delete({
      where: { userId },
    });
  }
}

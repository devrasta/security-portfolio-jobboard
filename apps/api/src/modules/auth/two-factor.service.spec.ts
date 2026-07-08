import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { PrismaService } from '../prisma/prisma.service';
import { HashService } from '@/modules/security/hash.service';

jest.mock('otplib', () => ({
  generateSecret: jest.fn().mockReturnValue('TOTP_SECRET_BASE32'),
  generateURI: jest.fn().mockReturnValue('otpauth://totp/Test?secret=TOTP_SECRET_BASE32'),
  verify: jest.fn(),
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,fakeqrcode'),
}));

import { generateSecret, generateURI, verify } from 'otplib';
import { toDataURL } from 'qrcode';

describe('TwoFactorService', () => {
  let service: TwoFactorService;
  let prisma: any;
  let hashService: any;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    twoFactorSecret: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockHashService = {
    generateSecureToken: jest.fn(),
    hashPassword: jest.fn(),
    verifyPassword: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockTwoFactorSecret = {
    userId: 'user-123',
    secret: 'TOTP_SECRET_BASE32',
    isEnabled: true,
    backupCodes: ['$hashed-code-1', '$hashed-code-2'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HashService, useValue: mockHashService },
      ],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);
    prisma = module.get(PrismaService);
    hashService = module.get(HashService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateBackupCodes', () => {
    it('should generate the requested number of backup codes', () => {
      mockHashService.generateSecureToken
        .mockReturnValueOnce('AABBCCDD')
        .mockReturnValueOnce('11223344')
        .mockReturnValueOnce('DEADBEEF');

      const codes = service.generateBackupCodes(3);

      expect(codes).toHaveLength(3);
      expect(mockHashService.generateSecureToken).toHaveBeenCalledTimes(3);
      expect(mockHashService.generateSecureToken).toHaveBeenCalledWith(4);
    });

    it('should return codes from hashService.generateSecureToken', () => {
      mockHashService.generateSecureToken.mockReturnValue('CAFEBABE');

      const codes = service.generateBackupCodes(2);

      expect(codes).toEqual(['CAFEBABE', 'CAFEBABE']);
    });

    it('should return empty array when count is 0', () => {
      const codes = service.generateBackupCodes(0);
      expect(codes).toHaveLength(0);
      expect(mockHashService.generateSecureToken).not.toHaveBeenCalled();
    });
  });

  describe('generateSecret', () => {
    beforeEach(() => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.twoFactorSecret.upsert.mockResolvedValue({});
      (generateSecret as jest.Mock).mockReturnValue('TOTP_SECRET_BASE32');
      (generateURI as jest.Mock).mockReturnValue('otpauth://totp/test');
      (toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,qrcode');
    });

    it('should find the user by id', async () => {
      await service.generateSecret('user-123');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { email: true },
      });
    });

    it('should throw if user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.generateSecret('unknown-user')).rejects.toThrow(
        'User not found',
      );
    });

    it('should generate a TOTP secret', async () => {
      await service.generateSecret('user-123');
      expect(generateSecret).toHaveBeenCalled();
    });

    it('should generate QR code URI with correct params', async () => {
      await service.generateSecret('user-123');
      expect(generateURI).toHaveBeenCalledWith({
        issuer: 'Auth Secure System overstand',
        label: mockUser.email,
        secret: 'TOTP_SECRET_BASE32',
        strategy: 'totp',
      });
    });

    it('should upsert twoFactorSecret in database', async () => {
      await service.generateSecret('user-123');
      expect(prisma.twoFactorSecret.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        update: { secret: 'TOTP_SECRET_BASE32', isEnabled: false },
        create: {
          userId: 'user-123',
          secret: 'TOTP_SECRET_BASE32',
          isEnabled: false,
          backupCodes: [],
        },
      });
    });

    it('should return secret and qrCode', async () => {
      const result = await service.generateSecret('user-123');
      expect(result).toEqual({
        secret: 'TOTP_SECRET_BASE32',
        qrCode: 'data:image/png;base64,qrcode',
      });
    });
  });

  describe('enableTwoFactor', () => {
    beforeEach(() => {
      mockPrismaService.twoFactorSecret.findUnique.mockResolvedValue({
        ...mockTwoFactorSecret,
        isEnabled: false,
      });
      (verify as jest.Mock).mockResolvedValue({ valid: true });
      mockHashService.generateSecureToken.mockReturnValue('AABBCCDD');
      mockHashService.hashPassword.mockResolvedValue('$hashed-backup');
      mockPrismaService.twoFactorSecret.update.mockResolvedValue({});
    });

    it('should throw BadRequestException when 2FA secret is not initialized', async () => {
      mockPrismaService.twoFactorSecret.findUnique.mockResolvedValue(null);

      await expect(
        service.enableTwoFactor('user-123', '123456'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.enableTwoFactor('user-123', '123456'),
      ).rejects.toThrow('2FA not initialized. Generate secret first.');
    });

    it('should verify the TOTP token', async () => {
      await service.enableTwoFactor('user-123', '123456');

      expect(verify).toHaveBeenCalledWith({
        secret: mockTwoFactorSecret.secret,
        token: '123456',
      });
    });

    it('should throw BadRequestException when TOTP token is invalid', async () => {
      (verify as jest.Mock).mockResolvedValue({ valid: false });

      await expect(
        service.enableTwoFactor('user-123', '000000'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.enableTwoFactor('user-123', '000000'),
      ).rejects.toThrow('Invalid 2FA code');
    });

    it('should generate 10 backup codes', async () => {
      await service.enableTwoFactor('user-123', '123456');
      expect(mockHashService.generateSecureToken).toHaveBeenCalledTimes(10);
    });

    it('should hash each backup code', async () => {
      await service.enableTwoFactor('user-123', '123456');
      expect(mockHashService.hashPassword).toHaveBeenCalledTimes(10);
    });

    it('should update twoFactorSecret in database with isEnabled and hashed codes', async () => {
      mockHashService.hashPassword.mockResolvedValue('$hashed');

      await service.enableTwoFactor('user-123', '123456');

      expect(prisma.twoFactorSecret.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: {
          isEnabled: true,
          backupCodes: expect.arrayContaining(['$hashed']),
        },
      });
    });

    it('should return the plain backup codes', async () => {
      mockHashService.generateSecureToken.mockReturnValue('CAFEBABE');

      const result = await service.enableTwoFactor('user-123', '123456');

      expect(result).toHaveProperty('backupCodes');
      expect(result.backupCodes).toHaveLength(10);
      expect(result.backupCodes[0]).toBe('CAFEBABE');
    });
  });

  describe('verifyCode', () => {
    beforeEach(() => {
      mockPrismaService.twoFactorSecret.findUnique.mockResolvedValue(
        mockTwoFactorSecret,
      );
      (verify as jest.Mock).mockResolvedValue({ valid: true });
    });

    it('should return false when twoFactorSecret is not found', async () => {
      mockPrismaService.twoFactorSecret.findUnique.mockResolvedValue(null);

      const result = await service.verifyCode('user-123', '123456');
      expect(result).toBe(false);
    });

    it('should call otplib verify for 6-digit TOTP token', async () => {
      await service.verifyCode('user-123', '123456');

      expect(verify).toHaveBeenCalledWith({
        secret: mockTwoFactorSecret.secret,
        token: '123456',
      });
    });

    it('should return true when TOTP token is valid', async () => {
      (verify as jest.Mock).mockResolvedValue({ valid: true });

      const result = await service.verifyCode('user-123', '123456');
      expect(result).toBe(true);
    });

    it('should return false when TOTP token is invalid', async () => {
      (verify as jest.Mock).mockResolvedValue({ valid: false });

      const result = await service.verifyCode('user-123', '000000');
      expect(result).toBe(false);
    });

    it('should call verifyBackupCode for 8-char hex token', async () => {
      const verifyBackupCodeSpy = jest
        .spyOn(service, 'verifyBackupCode')
        .mockResolvedValue(true);

      const result = await service.verifyCode('user-123', 'AABBCCDD');
      expect(verifyBackupCodeSpy).toHaveBeenCalledWith('user-123', 'AABBCCDD');
      expect(result).toBe(true);
    });

    it('should uppercase the backup code before calling verifyBackupCode', async () => {
      const verifyBackupCodeSpy = jest
        .spyOn(service, 'verifyBackupCode')
        .mockResolvedValue(true);

      await service.verifyCode('user-123', 'aabbccdd');
      expect(verifyBackupCodeSpy).toHaveBeenCalledWith('user-123', 'AABBCCDD');
    });

    it('should return false for tokens that are neither 6 nor 8 hex chars', async () => {
      const result = await service.verifyCode('user-123', '12345');
      expect(result).toBe(false);
    });

    it('should return false for 8-char non-hex tokens', async () => {
      const result = await service.verifyCode('user-123', 'GGGGGGGG');
      expect(result).toBe(false);
    });
  });

  describe('verifyBackupCode', () => {
    beforeEach(() => {
      mockPrismaService.twoFactorSecret.findUnique.mockResolvedValue({
        backupCodes: ['$hashed-1', '$hashed-2'],
      });
      mockHashService.verifyPassword.mockReturnValue(false);
    });

    it('should return false when twoFactorSecret is not found', async () => {
      mockPrismaService.twoFactorSecret.findUnique.mockResolvedValue(null);

      const result = await service.verifyBackupCode('user-123', 'AABBCCDD');
      expect(result).toBe(false);
    });

    it('should query twoFactorSecret with isEnabled: true and select backupCodes', async () => {
      await service.verifyBackupCode('user-123', 'AABBCCDD');

      expect(prisma.twoFactorSecret.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-123', isEnabled: true },
        select: { backupCodes: true },
      });
    });

    it('should return true when a backup code matches', async () => {
      mockHashService.verifyPassword
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const result = await service.verifyBackupCode('user-123', 'AABBCCDD');
      expect(result).toBe(true);
    });

    it('should return false when no backup code matches', async () => {
      mockHashService.verifyPassword.mockReturnValue(false);

      const result = await service.verifyBackupCode('user-123', 'AABBCCDD');
      expect(result).toBe(false);
    });

    it('should call hashService.verifyPassword for each stored code until match', async () => {
      mockHashService.verifyPassword
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      await service.verifyBackupCode('user-123', 'AABBCCDD');

      expect(mockHashService.verifyPassword).toHaveBeenCalledWith(
        '$hashed-1',
        'AABBCCDD',
      );
    });
  });

  describe('isTwoFactorEnabled', () => {
    it('should return true when twoFactorSecret exists with isEnabled: true', async () => {
      mockPrismaService.twoFactorSecret.findUnique.mockResolvedValue(
        mockTwoFactorSecret,
      );

      const result = await service.isTwoFactorEnabled('user-123');
      expect(result).toBe(true);
    });

    it('should return false when twoFactorSecret is not found', async () => {
      mockPrismaService.twoFactorSecret.findUnique.mockResolvedValue(null);

      const result = await service.isTwoFactorEnabled('user-123');
      expect(result).toBe(false);
    });

    it('should query with isEnabled: true', async () => {
      mockPrismaService.twoFactorSecret.findUnique.mockResolvedValue(null);

      await service.isTwoFactorEnabled('user-123');

      expect(prisma.twoFactorSecret.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-123', isEnabled: true },
      });
    });
  });

  describe('disableTwoFactor', () => {
    beforeEach(() => {
      mockPrismaService.twoFactorSecret.findUnique.mockResolvedValue(
        mockTwoFactorSecret,
      );
      jest.spyOn(service, 'verifyCode').mockResolvedValue(true);
      mockPrismaService.twoFactorSecret.delete.mockResolvedValue({});
    });

    it('should throw BadRequestException when 2FA is not enabled', async () => {
      mockPrismaService.twoFactorSecret.findUnique.mockResolvedValue(null);

      await expect(
        service.disableTwoFactor('user-123', '123456'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.disableTwoFactor('user-123', '123456'),
      ).rejects.toThrow('2FA is not enabled');
    });

    it('should verify the provided code', async () => {
      await service.disableTwoFactor('user-123', '123456');

      expect(service.verifyCode).toHaveBeenCalledWith('user-123', '123456');
    });

    it('should throw BadRequestException when the code is invalid', async () => {
      jest.spyOn(service, 'verifyCode').mockResolvedValue(false);

      await expect(
        service.disableTwoFactor('user-123', '000000'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.disableTwoFactor('user-123', '000000'),
      ).rejects.toThrow('Invalid 2FA code');
    });

    it('should delete the twoFactorSecret from database', async () => {
      await service.disableTwoFactor('user-123', '123456');

      expect(prisma.twoFactorSecret.delete).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });

    it('should not delete secret when code is invalid', async () => {
      jest.spyOn(service, 'verifyCode').mockResolvedValue(false);

      await expect(
        service.disableTwoFactor('user-123', '000000'),
      ).rejects.toThrow();
      expect(prisma.twoFactorSecret.delete).not.toHaveBeenCalled();
    });
  });
});

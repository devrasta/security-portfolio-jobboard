import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtManagerService } from './jwtManager.service';
import { PrismaService } from '../prisma/prisma.service';
import { HashService } from './hash.service';

describe('JwtManagerService', () => {
  let service: JwtManagerService;
  let nestJwtService: any;
  let prisma: any;
  let hashService: any;

  const mockNestJwtService = {
    sign: jest.fn().mockReturnValue('signed-access-token'),
    signAsync: jest.fn().mockResolvedValue('signed-refresh-token'),
    verify: jest
      .fn()
      .mockReturnValue({ sub: 'user-1', email: 'test@test.com' }),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        JWT_SECRET: 'test-jwt-secret-32chars-minimum!!',
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_SECRET: 'test-refresh-secret-32chars-min!!',
      };
      return config[key];
    }),
  };

  const mockPrismaService = {
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockHashService = {
    hashToken: jest.fn().mockReturnValue('hashed-token'),
  };

  beforeEach(async () => {
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars-min!!';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtManagerService,
        { provide: NestJwtService, useValue: mockNestJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HashService, useValue: mockHashService },
      ],
    }).compile();

    service = module.get<JwtManagerService>(JwtManagerService);
    nestJwtService = module.get(NestJwtService);
    prisma = module.get(PrismaService);
    hashService = module.get(HashService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAccessToken', () => {
    it('should call nestJwtService.sign with sub and email', () => {
      service.generateAccessToken({ userId: 'user-1', email: 'test@test.com' });

      expect(nestJwtService.sign).toHaveBeenCalledWith(
        { sub: 'user-1', email: 'test@test.com' },
        expect.objectContaining({
          expiresIn: '15m',
          secret: 'test-jwt-secret-32chars-minimum!!',
        }),
      );
    });

    it('should return the signed token', () => {
      const result = service.generateAccessToken({
        userId: 'user-1',
        email: 'test@test.com',
      });
      expect(result).toBe('signed-access-token');
    });
  });

  describe('generateRefreshToken', () => {
    it('should sign with JWT_REFRESH_SECRET and 7d expiry', async () => {
      prisma.refreshToken.create.mockResolvedValue({});

      await service.generateRefreshToken('user-1', 'family-1');

      expect(nestJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          type: 'refresh',
          family: 'family-1',
          jti: expect.any(String),
        }),
        expect.objectContaining({
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: '7d',
        }),
      );
    });

    it('should store the hashed token in database', async () => {
      prisma.refreshToken.create.mockResolvedValue({});
      hashService.hashToken.mockReturnValue('hashed-refresh');

      await service.generateRefreshToken('user-1', 'family-1');

      expect(hashService.hashToken).toHaveBeenCalledWith(
        'signed-refresh-token',
      );
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          token: 'hashed-refresh',
          tokenFamily: 'family-1',
          isRevoked: false,
          jti: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      });
    });

    it('should return the raw refresh token', async () => {
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.generateRefreshToken('user-1', 'family-1');
      expect(result).toBe('signed-refresh-token');
    });

    it('should set expiresAt to 7 days from now', async () => {
      prisma.refreshToken.create.mockResolvedValue({});

      const before = Date.now();
      await service.generateRefreshToken('user-1', 'family-1');

      const createCall = prisma.refreshToken.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt.getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(before + sevenDays - 1000);
      expect(expiresAt).toBeLessThanOrEqual(Date.now() + sevenDays + 1000);
    });
  });

  describe('verifyAccessToken', () => {
    it('should call nestJwtService.verify with token and secret', () => {
      service.verifyAccessToken('some-token');

      expect(nestJwtService.verify).toHaveBeenCalledWith(
        'some-token',
        'test-jwt-secret-32chars-minimum!!',
      );
    });

    it('should return the decoded payload', () => {
      nestJwtService.verify.mockReturnValue({
        sub: 'user-1',
        email: 'test@test.com',
      });
      const result = service.verifyAccessToken('some-token');
      expect(result).toEqual({ sub: 'user-1', email: 'test@test.com' });
    });

    it('should throw when token is invalid', () => {
      nestJwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });
      expect(() => service.verifyAccessToken('bad-token')).toThrow(
        'invalid signature',
      );
    });
  });

  describe('verifyRefreshToken', () => {
    const decoded = { sub: 'user-1', family: 'family-1', jti: 'jti-123' };

    it('should verify JWT and look up token in DB', async () => {
      nestJwtService.verifyAsync.mockResolvedValue(decoded);
      prisma.refreshToken.findUnique.mockResolvedValue({
        jti: 'jti-123',
        isRevoked: false,
        tokenFamily: 'family-1',
      });

      await service.verifyRefreshToken('refresh-token');

      expect(nestJwtService.verifyAsync).toHaveBeenCalledWith('refresh-token', {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { jti: 'jti-123' },
      });
    });

    it('should return userId, tokenFamily and jti when valid', async () => {
      nestJwtService.verifyAsync.mockResolvedValue(decoded);
      prisma.refreshToken.findUnique.mockResolvedValue({
        jti: 'jti-123',
        isRevoked: false,
        tokenFamily: 'family-1',
      });

      const result = await service.verifyRefreshToken('refresh-token');

      expect(result).toEqual({
        userId: 'user-1',
        tokenFamily: 'family-1',
        jti: 'jti-123',
      });
    });

    it('should throw UnauthorizedException when token not found in DB', async () => {
      nestJwtService.verifyAsync.mockResolvedValue(decoded);
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.verifyRefreshToken('refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyRefreshToken('refresh-token')).rejects.toThrow(
        'Token not found',
      );
    });

    it('should throw UnauthorizedException and revoke family on token theft', async () => {
      nestJwtService.verifyAsync.mockResolvedValue(decoded);
      prisma.refreshToken.findUnique.mockResolvedValue({
        jti: 'jti-123',
        isRevoked: true,
        tokenFamily: 'family-1',
      });
      prisma.refreshToken.updateMany.mockResolvedValue({});

      await expect(service.verifyRefreshToken('refresh-token')).rejects.toThrow(
        'Token theft detected',
      );

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenFamily: 'family-1' },
        data: { isRevoked: true },
      });
    });

    it('should propagate JWT verification errors', async () => {
      nestJwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.verifyRefreshToken('expired-token')).rejects.toThrow(
        'jwt expired',
      );
    });
  });

  describe('revokeTokenFamily', () => {
    it('should update all tokens in the family to isRevoked:true', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      await service.revokeTokenFamily('family-1');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenFamily: 'family-1' },
        data: { isRevoked: true },
      });
    });
  });
});

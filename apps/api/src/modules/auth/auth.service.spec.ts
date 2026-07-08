import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { HashService } from '@/modules/security/hash.service';
import { JwtManagerService } from '@/modules/security/jwtManager.service';
import { ValidationService } from '@/modules/security/validation.service';
import { TokenService } from '@/modules/security/token.service';
import { UsersService } from '@/modules/users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { TwoFactorService } from './two-factor.service';

describe('AuthService', () => {
  let service: AuthService;
  let hashService: any;
  let jwtService: any;
  let validationService: any;
  let tokenService: any;
  let usersService: any;
  let prisma: any;
  let twoFactorService: any;

  const mockHashService = {
    hashPassword: jest.fn().mockResolvedValue('$argon2-hashed'),
    verifyPassword: jest.fn().mockResolvedValue(true),
    hashToken: jest.fn().mockReturnValue('sha256-hashed-token'),
  };

  const mockJwtManagerService = {
    generateAccessToken: jest.fn().mockReturnValue('access-token-jwt'),
    generateRefreshToken: jest.fn().mockResolvedValue('refresh-token-jwt'),
    verifyRefreshToken: jest.fn(),
  };

  const mockValidationService = {
    isValidEmail: jest.fn().mockReturnValue(true),
    isStrongPassword: jest.fn().mockReturnValue(true),
    getPasswordStrength: jest.fn().mockReturnValue(4),
  };

  const mockTokenService = {
    generateVerificationToken: jest.fn().mockReturnValue('verification-token'),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    createUser: jest.fn(),
    updatePassword: jest.fn(),
  };

  const mockPrismaService = {
    refreshToken: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockTwoFactorService = {
    isTwoFactorEnabled: jest.fn(),
    verifyCode: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password: '$argon2-existing-hash',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: HashService, useValue: mockHashService },
        { provide: JwtManagerService, useValue: mockJwtManagerService },
        { provide: ValidationService, useValue: mockValidationService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TwoFactorService, useValue: mockTwoFactorService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    hashService = module.get(HashService);
    jwtService = module.get(JwtManagerService);
    validationService = module.get(ValidationService);
    tokenService = module.get(TokenService);
    usersService = module.get(UsersService);
    prisma = module.get(PrismaService);
    twoFactorService = module.get(TwoFactorService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'StrongPass1@ab',
    };

    it('should throw BadRequestException when email is invalid', async () => {
      validationService.isValidEmail.mockReturnValue(false);

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Invalid email',
      );
    });

    it('should throw BadRequestException when password is weak', async () => {
      validationService.isValidEmail.mockReturnValue(true);
      validationService.isStrongPassword.mockReturnValue(false);

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Weak password',
      );
    });

    it('should hash the password', async () => {
      validationService.isValidEmail.mockReturnValue(true);
      validationService.isStrongPassword.mockReturnValue(true);
      usersService.createUser.mockResolvedValue({
        email: registerDto.email,
        name: registerDto.name,
      });

      await service.register(registerDto);

      expect(hashService.hashPassword).toHaveBeenCalledWith(
        registerDto.password,
      );
    });

    it('should generate a verification token', async () => {
      validationService.isValidEmail.mockReturnValue(true);
      validationService.isStrongPassword.mockReturnValue(true);
      usersService.createUser.mockResolvedValue({
        email: registerDto.email,
        name: registerDto.name,
      });

      await service.register(registerDto);

      expect(tokenService.generateVerificationToken).toHaveBeenCalled();
    });

    it('should call createUser with hashed password and verification token', async () => {
      validationService.isValidEmail.mockReturnValue(true);
      validationService.isStrongPassword.mockReturnValue(true);
      hashService.hashPassword.mockResolvedValue('$hashed-pw');
      tokenService.generateVerificationToken.mockReturnValue('verify-tok');
      usersService.createUser.mockResolvedValue({
        email: registerDto.email,
        name: registerDto.name,
      });

      await service.register(registerDto);

      expect(usersService.createUser).toHaveBeenCalledWith({
        name: registerDto.name,
        email: registerDto.email,
        password: '$hashed-pw',
        emailVerificationToken: 'verify-tok',
      });
    });

    it('should return the result of createUser', async () => {
      validationService.isValidEmail.mockReturnValue(true);
      validationService.isStrongPassword.mockReturnValue(true);
      const expected = { email: registerDto.email, name: registerDto.name };
      usersService.createUser.mockResolvedValue(expected);

      const result = await service.register(registerDto);
      expect(result).toEqual(expected);
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'StrongPass1@ab' };
    const deviceInfo = {
      deviceId: 'device-1',
      userAgent: 'Mozilla/5.0',
      ipAddress: '1.2.3.4',
    };

    beforeEach(() => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      hashService.verifyPassword.mockResolvedValue(true);
      jwtService.generateAccessToken.mockReturnValue('access-jwt');
      prisma.refreshToken.create.mockResolvedValue({});
      mockTwoFactorService.isTwoFactorEnabled.mockResolvedValue(false);
    });

    it('should find user by email', async () => {
      await service.login(loginDto, deviceInfo);
      expect(usersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      hashService.verifyPassword.mockResolvedValue(false);

      await expect(service.login(loginDto, deviceInfo)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto, deviceInfo)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should generate an access token with userId and email', async () => {
      await service.login(loginDto, deviceInfo);

      expect(jwtService.generateAccessToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
      });
    });

    it('should return accessToken, refreshToken and user', async () => {
      jwtService.generateAccessToken.mockReturnValue('new-access');
      jwtService.generateRefreshToken.mockResolvedValue('new-refresh');

      const result = await service.login(loginDto, deviceInfo);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toEqual({ id: mockUser.id, name: mockUser.name });
    });

    it('should handle missing deviceInfo gracefully', async () => {
      await expect(service.login(loginDto)).resolves.toBeDefined();
    });

    it('should return twoFactorRequired challenge when 2FA is enabled', async () => {
      mockTwoFactorService.isTwoFactorEnabled.mockResolvedValue(true);
      jwtService.generateAccessToken.mockReturnValue('temp-access-token');

      const result = await service.login(loginDto, deviceInfo);

      expect(result).toEqual({
        twoFactorRequired: true,
        accessToken: expect.any(String),
      });
    });
  });

  describe('generateRefreshToken', () => {
    beforeEach(() => {
      jwtService.generateRefreshToken.mockResolvedValue('jwt-refresh');
      hashService.hashToken.mockReturnValue('hashed');
      prisma.refreshToken.create.mockResolvedValue({});
    });

    it('should call jwtService.generateRefreshToken with userId and tokenFamily', async () => {
      await service.generateRefreshToken({
        userId: 'user-1',
        tokenFamily: 'family-1',
        deviceInfo: { deviceId: 'd1', userAgent: 'ua', ipAddress: '1.1.1.1' },
      });

      expect(jwtService.generateRefreshToken).toHaveBeenCalledWith(
        'user-1',
        'family-1',
      );
    });

    it('should hash the generated refresh token', async () => {
      await service.generateRefreshToken({
        userId: 'user-1',
        tokenFamily: 'family-1',
        deviceInfo: { deviceId: 'd1', userAgent: 'ua', ipAddress: '1.1.1.1' },
      });

      expect(hashService.hashToken).toHaveBeenCalledWith('jwt-refresh');
    });

    it('should store token in database with correct fields', async () => {
      await service.generateRefreshToken({
        userId: 'user-1',
        tokenFamily: 'family-1',
        deviceInfo: {
          deviceId: 'd1',
          userAgent: 'Mozilla/5.0',
          ipAddress: '1.2.3.4',
        },
      });

      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jti: expect.any(String),
          userId: 'user-1',
          token: 'hashed',
          tokenFamily: 'family-1',
          isRevoked: false,
          deviceId: 'd1',
          userAgent: 'Mozilla/5.0',
          ipAddress: '1.2.3.4',
          expiresAt: expect.any(Date),
        }),
      });
    });

    it('should convert array userAgent to comma-separated string', async () => {
      await service.generateRefreshToken({
        userId: 'user-1',
        tokenFamily: 'family-1',
        deviceInfo: {
          deviceId: 'd1',
          userAgent: ['UA1', 'UA2'],
          ipAddress: '1.1.1.1',
        },
      });

      const createCall = prisma.refreshToken.create.mock.calls[0][0];
      expect(createCall.data.userAgent).toBe('UA1, UA2');
    });

    it('should return the raw refresh token', async () => {
      const result = await service.generateRefreshToken({
        userId: 'user-1',
        tokenFamily: 'family-1',
        deviceInfo: { deviceId: 'd1', userAgent: 'ua', ipAddress: '1.1.1.1' },
      });

      expect(result).toBe('jwt-refresh');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should call jwtService.verifyRefreshToken', async () => {
      jwtService.verifyRefreshToken.mockResolvedValue({
        userId: 'user-1',
        tokenFamily: 'family-1',
        jti: 'jti-1',
      });
      usersService.findById.mockResolvedValue(mockUser);

      await service.verifyRefreshToken('some-token');

      expect(jwtService.verifyRefreshToken).toHaveBeenCalledWith('some-token');
    });

    it('should find user by id from JWT payload', async () => {
      jwtService.verifyRefreshToken.mockResolvedValue({
        userId: 'user-1',
        tokenFamily: 'family-1',
        jti: 'jti-1',
      });
      usersService.findById.mockResolvedValue(mockUser);

      await service.verifyRefreshToken('some-token');

      expect(usersService.findById).toHaveBeenCalledWith('user-1');
    });

    it('should return user, tokenFamily and jti', async () => {
      jwtService.verifyRefreshToken.mockResolvedValue({
        userId: 'user-1',
        tokenFamily: 'family-1',
        jti: 'jti-1',
      });
      usersService.findById.mockResolvedValue(mockUser);

      const result = await service.verifyRefreshToken('some-token');

      expect(result).toEqual({
        user: mockUser,
        tokenFamily: 'family-1',
        jti: 'jti-1',
      });
    });

    it('should propagate UnauthorizedException from jwtService', async () => {
      jwtService.verifyRefreshToken.mockRejectedValue(
        new UnauthorizedException('Token theft detected'),
      );

      await expect(service.verifyRefreshToken('bad-token')).rejects.toThrow(
        'Token theft detected',
      );
    });
  });

  describe('refresh', () => {
    beforeEach(() => {
      jwtService.verifyRefreshToken.mockResolvedValue({
        userId: mockUser.id,
        tokenFamily: 'family-1',
        jti: 'old-jti',
      });
      usersService.findById.mockResolvedValue(mockUser);
      prisma.refreshToken.update.mockResolvedValue({});
      jwtService.generateAccessToken.mockReturnValue('new-access');
      jwtService.generateRefreshToken.mockResolvedValue('new-refresh');
    });

    it('should verify the refresh token', async () => {
      await service.refresh('old-refresh-token');

      expect(jwtService.verifyRefreshToken).toHaveBeenCalledWith(
        'old-refresh-token',
      );
    });

    it('should revoke the old token', async () => {
      await service.refresh('old-refresh-token');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { jti: 'old-jti' },
        data: { isRevoked: true },
      });
    });

    it('should generate new access token for the user', async () => {
      await service.refresh('old-refresh-token');

      expect(jwtService.generateAccessToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
      });
    });

    it('should generate new refresh token with same tokenFamily', async () => {
      await service.refresh('old-refresh-token');

      expect(jwtService.generateRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        'family-1',
      );
    });

    it('should return new tokens and user', async () => {
      const result = await service.refresh('old-refresh-token');

      expect(result).toEqual({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        user: { id: mockUser.id, name: mockUser.name },
      });
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      jwtService.verifyRefreshToken.mockResolvedValue({
        userId: mockUser.id,
        tokenFamily: 'family-1',
        jti: 'logout-jti',
      });
      usersService.findById.mockResolvedValue(mockUser);
      prisma.refreshToken.update.mockResolvedValue({});
    });

    it('should verify the refresh token', async () => {
      await service.logout('refresh-token');

      expect(jwtService.verifyRefreshToken).toHaveBeenCalledWith(
        'refresh-token',
      );
    });

    it('should revoke the token', async () => {
      await service.logout('refresh-token');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { jti: 'logout-jti' },
        data: { isRevoked: true },
      });
    });

    it('should propagate errors when verification fails', async () => {
      jwtService.verifyRefreshToken.mockRejectedValue(
        new UnauthorizedException('Token not found'),
      );

      await expect(service.logout('bad-token')).rejects.toThrow(
        'Token not found',
      );
    });
  });

  describe('changePassword', () => {
    const params = {
      userId: 'user-123',
      currentPassword: 'OldPassword1@',
      newPassword: 'NewPassword1@ab',
    };

    beforeEach(() => {
      usersService.findById.mockResolvedValue(mockUser);
      hashService.verifyPassword.mockResolvedValue(true);
      hashService.hashPassword.mockResolvedValue('$new-argon2-hash');
      usersService.updatePassword.mockResolvedValue(undefined);
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });
    });

    it('should find the user by id', async () => {
      await service.changePassword(params);
      expect(usersService.findById).toHaveBeenCalledWith(params.userId);
    });

    it('should throw UnauthorizedException when current password is wrong', async () => {
      hashService.verifyPassword.mockResolvedValue(false);

      await expect(service.changePassword(params)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.changePassword(params)).rejects.toThrow(
        'Current password is incorrect',
      );
    });

    it('should hash the new password', async () => {
      await service.changePassword(params);
      expect(hashService.hashPassword).toHaveBeenCalledWith(params.newPassword);
    });

    it('should update the password via usersService', async () => {
      await service.changePassword(params);
      expect(usersService.updatePassword).toHaveBeenCalledWith(
        params.userId,
        '$new-argon2-hash',
      );
    });

    it('should revoke all non-revoked refresh tokens', async () => {
      await service.changePassword(params);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: params.userId, isRevoked: false },
        data: { isRevoked: true },
      });
    });

    it('should not update password if current password is wrong', async () => {
      hashService.verifyPassword.mockResolvedValue(false);

      await expect(service.changePassword(params)).rejects.toThrow();
      expect(usersService.updatePassword).not.toHaveBeenCalled();
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('loginWith2FA', () => {
    const temporaryToken = 'temp-jwt-token';
    const twoFactorCode = '123456';
    const jwtPayload = { sub: 'user-123', email: 'test@example.com' };

    beforeEach(() => {
      jwtService.verifyAccessToken = jest.fn().mockReturnValue(jwtPayload);
      mockTwoFactorService.verifyCode.mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      jwtService.generateAccessToken.mockReturnValue('new-access-token');
      jwtService.generateRefreshToken.mockResolvedValue('new-refresh-token');
      prisma.refreshToken.create.mockResolvedValue({});
      hashService.hashToken.mockReturnValue('hashed-token');
    });

    it('should throw UnauthorizedException when temporary token is invalid', async () => {
      jwtService.verifyAccessToken.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(
        service.loginWith2FA(temporaryToken, twoFactorCode),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.loginWith2FA(temporaryToken, twoFactorCode),
      ).rejects.toThrow('Invalid or expired temporary token');
    });

    it('should throw UnauthorizedException when 2FA code is invalid', async () => {
      mockTwoFactorService.verifyCode.mockResolvedValue(false);

      await expect(
        service.loginWith2FA(temporaryToken, twoFactorCode),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.loginWith2FA(temporaryToken, twoFactorCode),
      ).rejects.toThrow('Invalid 2FA code');
    });

    it('should find the user by id from the JWT payload sub', async () => {
      await service.loginWith2FA(temporaryToken, twoFactorCode);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: jwtPayload.sub },
      });
    });

    it('should return accessToken, refreshToken and user on success', async () => {
      const result = await service.loginWith2FA(temporaryToken, twoFactorCode);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: { id: mockUser.id, name: mockUser.name },
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ActivityService } from '../activity/activity.service';
import { CryptoService } from '../security/crypto.service';
import { ValidationService } from '@/modules/security/validation.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;
  let activityService: any;
  let cryptoService: any;
  let validationService: any;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    changePassword: jest.fn(),
    loginWith2FA: jest.fn(),
  };

  const mockActivityService = {
    logActivity: jest.fn().mockResolvedValue(undefined),
  };

  const mockCryptoService = {
    encrypt: jest.fn().mockReturnValue('encrypted-token'),
    decrypt: jest.fn().mockReturnValue('decrypted-token'),
  };

  const mockValidationService = {
    getPasswordStrength: jest.fn().mockReturnValue(4),
  };

  const mockUser = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockReq = () => ({
    cookies: {},
    headers: { 'user-agent': 'Jest/1.0' },
    ip: '1.2.3.4',
    user: { sub: 'user-1', userId: 'user-1' },
  });

  const mockRes = () => ({
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ActivityService, useValue: mockActivityService },
        { provide: CryptoService, useValue: mockCryptoService },
        { provide: ValidationService, useValue: mockValidationService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    activityService = module.get(ActivityService);
    cryptoService = module.get(CryptoService);
    validationService = module.get(ValidationService);
    jest.clearAllMocks();
    mockActivityService.logActivity.mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'StrongPass1@ab',
    };

    it('should delegate to authService.register', async () => {
      mockAuthService.register.mockResolvedValue({ email: registerDto.email });

      await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should return the result of authService.register', async () => {
      const expected = { email: registerDto.email, name: registerDto.name };
      mockAuthService.register.mockResolvedValue(expected);

      const result = await controller.register(registerDto);

      expect(result).toEqual(expected);
    });
  });

  describe('checkPasswordStrength', () => {
    it('should delegate to validationService.getPasswordStrength', () => {
      mockValidationService.getPasswordStrength.mockReturnValue(3);

      controller.checkPasswordStrength('mypassword');

      expect(validationService.getPasswordStrength).toHaveBeenCalledWith(
        'mypassword',
      );
    });

    it('should return an object with strength property', () => {
      mockValidationService.getPasswordStrength.mockReturnValue(4);

      const result = controller.checkPasswordStrength('StrongPass1@');

      expect(result).toEqual({ strength: 4 });
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'StrongPass1@ab' };

    it('should return loginResponse directly when twoFactorRequired is present', async () => {
      const twoFactorChallenge = {
        twoFactorRequired: true,
        accessToken: 'temp-token',
      };
      mockAuthService.login.mockResolvedValue(twoFactorChallenge);
      const req = mockReq();
      const res = mockRes();

      const result = await controller.logIn(loginDto, req as any, res as any);

      expect(result).toEqual(twoFactorChallenge);
      expect(res.cookie).not.toHaveBeenCalled();
      expect(activityService.logActivity).not.toHaveBeenCalled();
    });

    it('should set refreshToken cookie on successful login', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'access-jwt',
        refreshToken: 'refresh-jwt',
        user: mockUser,
      });
      mockCryptoService.encrypt.mockReturnValue('encrypted-refresh');
      const req = mockReq();
      const res = mockRes();

      await controller.logIn(loginDto, req as any, res as any);

      expect(cryptoService.encrypt).toHaveBeenCalledWith('refresh-jwt');
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'encrypted-refresh',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict' }),
      );
    });

    it('should log LOGIN_SUCCESS activity on successful login', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'access-jwt',
        refreshToken: 'refresh-jwt',
        user: mockUser,
      });
      const req = mockReq();
      const res = mockRes();

      await controller.logIn(loginDto, req as any, res as any);

      expect(activityService.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_SUCCESS', userId: mockUser.id }),
      );
    });

    it('should return accessToken and user on successful login', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'access-jwt',
        refreshToken: 'refresh-jwt',
        user: mockUser,
      });
      const req = mockReq();
      const res = mockRes();

      const result = await controller.logIn(loginDto, req as any, res as any);

      expect(result).toEqual({ accessToken: 'access-jwt', user: mockUser });
    });

    it('should log LOGIN_FAILURE activity and rethrow on error', async () => {
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );
      const req = mockReq();
      const res = mockRes();

      await expect(
        controller.logIn(loginDto, req as any, res as any),
      ).rejects.toThrow('Invalid credentials');

      expect(activityService.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_FAILURE' }),
      );
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException when refreshToken cookie is missing', async () => {
      const req = { ...mockReq(), cookies: {} };
      const res = mockRes();

      await expect(
        controller.refresh(req as any, res as any),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        controller.refresh(req as any, res as any),
      ).rejects.toThrow('Refresh token not found');
    });

    it('should decrypt the encrypted cookie and call authService.refresh', async () => {
      const req = { ...mockReq(), cookies: { refreshToken: 'encrypted-rt' } };
      const res = mockRes();
      mockCryptoService.decrypt.mockReturnValue('raw-refresh-token');
      mockAuthService.refresh.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        user: mockUser,
      });

      await controller.refresh(req as any, res as any);

      expect(cryptoService.decrypt).toHaveBeenCalledWith('encrypted-rt');
      expect(authService.refresh).toHaveBeenCalledWith('raw-refresh-token');
    });

    it('should set a new refreshToken cookie on success', async () => {
      const req = { ...mockReq(), cookies: { refreshToken: 'encrypted-rt' } };
      const res = mockRes();
      mockCryptoService.decrypt.mockReturnValue('raw-refresh-token');
      mockCryptoService.encrypt.mockReturnValue('new-encrypted-rt');
      mockAuthService.refresh.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        user: mockUser,
      });

      await controller.refresh(req as any, res as any);

      expect(cryptoService.encrypt).toHaveBeenCalledWith('new-refresh');
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'new-encrypted-rt',
        expect.objectContaining({ httpOnly: true }),
      );
    });

    it('should return accessToken and user on success', async () => {
      const req = { ...mockReq(), cookies: { refreshToken: 'encrypted-rt' } };
      const res = mockRes();
      mockCryptoService.decrypt.mockReturnValue('raw-refresh-token');
      mockAuthService.refresh.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        user: mockUser,
      });

      const result = await controller.refresh(req as any, res as any);

      expect(result).toEqual({ accessToken: 'new-access', user: mockUser });
    });

    it('should log TOKEN_REFRESH activity on success', async () => {
      const req = { ...mockReq(), cookies: { refreshToken: 'encrypted-rt' } };
      const res = mockRes();
      mockCryptoService.decrypt.mockReturnValue('raw-refresh-token');
      mockAuthService.refresh.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        user: mockUser,
      });

      await controller.refresh(req as any, res as any);

      expect(activityService.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TOKEN_REFRESH',
          userId: mockUser.id,
        }),
      );
    });
  });

  describe('changePassword', () => {
    const changePasswordDto = {
      currentPassword: 'OldPass1@',
      newPassword: 'NewPass1@ab',
    };

    it('should call authService.changePassword with userId from request', async () => {
      mockAuthService.changePassword.mockResolvedValue(undefined);
      const req = mockReq();

      await controller.changePassword(changePasswordDto as any, req as any);

      expect(authService.changePassword).toHaveBeenCalledWith({
        userId: 'user-1',
        currentPassword: changePasswordDto.currentPassword,
        newPassword: changePasswordDto.newPassword,
      });
    });

    it('should log PASSWORD_CHANGE activity on success', async () => {
      mockAuthService.changePassword.mockResolvedValue(undefined);
      const req = mockReq();

      await controller.changePassword(changePasswordDto as any, req as any);

      expect(activityService.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PASSWORD_CHANGE',
          userId: 'user-1',
        }),
      );
    });

    it('should return success message', async () => {
      mockAuthService.changePassword.mockResolvedValue(undefined);
      const req = mockReq();

      const result = await controller.changePassword(
        changePasswordDto as any,
        req as any,
      );

      expect(result).toEqual({ message: 'Password changed successfully' });
    });
  });

  describe('logout', () => {
    it('should decrypt cookie and call authService.logout when cookie is present', async () => {
      const req = { ...mockReq(), cookies: { refreshToken: 'encrypted-rt' } };
      const res = mockRes();
      mockCryptoService.decrypt.mockReturnValue('raw-refresh-token');
      mockAuthService.logout.mockResolvedValue(undefined);

      await controller.logOut(req as any, res as any);

      expect(cryptoService.decrypt).toHaveBeenCalledWith('encrypted-rt');
      expect(authService.logout).toHaveBeenCalledWith('raw-refresh-token');
    });

    it('should not call authService.logout when cookie is absent', async () => {
      const req = { ...mockReq(), cookies: {} };
      const res = mockRes();

      await controller.logOut(req as any, res as any);

      expect(authService.logout).not.toHaveBeenCalled();
    });

    it('should clear the refreshToken cookie', async () => {
      const req = { ...mockReq(), cookies: {} };
      const res = mockRes();

      await controller.logOut(req as any, res as any);

      expect(res.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({ httpOnly: true }),
      );
    });

    it('should log LOGOUT activity', async () => {
      const req = { ...mockReq(), cookies: {} };
      const res = mockRes();

      await controller.logOut(req as any, res as any);

      expect(activityService.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGOUT' }),
      );
    });

    it('should return success message', async () => {
      const req = { ...mockReq(), cookies: {} };
      const res = mockRes();

      const result = await controller.logOut(req as any, res as any);

      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('loginWith2FA', () => {
    const body = { accessToken: 'temp-token', code: '123456' };

    it('should call authService.loginWith2FA with accessToken and code', async () => {
      mockAuthService.loginWith2FA.mockResolvedValue({
        accessToken: 'final-access',
        refreshToken: 'final-refresh',
        user: mockUser,
      });
      const req = mockReq();
      const res = mockRes();

      await controller.loginWith2FA(body, req as any, res as any);

      expect(authService.loginWith2FA).toHaveBeenCalledWith(
        body.accessToken,
        body.code,
      );
    });

    it('should set refreshToken cookie on success', async () => {
      mockAuthService.loginWith2FA.mockResolvedValue({
        accessToken: 'final-access',
        refreshToken: 'final-refresh',
        user: mockUser,
      });
      mockCryptoService.encrypt.mockReturnValue('encrypted-final');
      const req = mockReq();
      const res = mockRes();

      await controller.loginWith2FA(body, req as any, res as any);

      expect(cryptoService.encrypt).toHaveBeenCalledWith('final-refresh');
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'encrypted-final',
        expect.objectContaining({ httpOnly: true }),
      );
    });

    it('should return accessToken and user on success', async () => {
      mockAuthService.loginWith2FA.mockResolvedValue({
        accessToken: 'final-access',
        refreshToken: 'final-refresh',
        user: mockUser,
      });
      const req = mockReq();
      const res = mockRes();

      const result = await controller.loginWith2FA(body, req as any, res as any);

      expect(result).toEqual({ accessToken: 'final-access', user: mockUser });
    });

    it('should log LOGIN_FAILURE activity and rethrow on error', async () => {
      mockAuthService.loginWith2FA.mockRejectedValue(
        new UnauthorizedException('Invalid 2FA code'),
      );
      const req = mockReq();
      const res = mockRes();

      await expect(
        controller.loginWith2FA(body, req as any, res as any),
      ).rejects.toThrow('Invalid 2FA code');

      expect(activityService.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_FAILURE' }),
      );
    });
  });
});

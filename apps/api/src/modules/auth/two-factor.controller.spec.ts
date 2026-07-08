import { Test, TestingModule } from '@nestjs/testing';
import { TwoFactorController } from './two-factor.controller';
import { TwoFactorService } from './two-factor.service';
import { Enable2FADto } from './dto/enable-2fa.dto';
import { Disable2FADto } from './dto/disable-2fa.dto';

describe('TwoFactorController', () => {
  let controller: TwoFactorController;
  let twoFactorService: any;

  const mockTwoFactorService = {
    generateSecret: jest.fn(),
    enableTwoFactor: jest.fn(),
    isTwoFactorEnabled: jest.fn(),
    disableTwoFactor: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwoFactorController],
      providers: [
        { provide: TwoFactorService, useValue: mockTwoFactorService },
      ],
    }).compile();

    controller = module.get<TwoFactorController>(TwoFactorController);
    twoFactorService = module.get(TwoFactorService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('setup', () => {
    it('should delegate to twoFactorService.generateSecret with userId', async () => {
      mockTwoFactorService.generateSecret.mockResolvedValue({
        secret: 'TOTP_SECRET',
        qrCode: 'data:image/png;base64,qr',
      });

      await controller.setup('user-1');

      expect(twoFactorService.generateSecret).toHaveBeenCalledWith('user-1');
    });

    it('should return secret and qrCode', async () => {
      const expected = { secret: 'TOTP_SECRET', qrCode: 'data:image/png;base64,qr' };
      mockTwoFactorService.generateSecret.mockResolvedValue(expected);

      const result = await controller.setup('user-1');

      expect(result).toEqual(expected);
    });
  });

  describe('enable', () => {
    it('should delegate to twoFactorService.enableTwoFactor with userId and code', () => {
      const dto: Enable2FADto = { code: '123456' };
      mockTwoFactorService.enableTwoFactor.mockResolvedValue({
        backupCodes: ['CODE1', 'CODE2'],
      });

      controller.enable(dto, 'user-1');

      expect(twoFactorService.enableTwoFactor).toHaveBeenCalledWith(
        'user-1',
        '123456',
      );
    });

    it('should return the result of enableTwoFactor', async () => {
      const dto: Enable2FADto = { code: '123456' };
      const expected = { backupCodes: ['CODE1', 'CODE2'] };
      mockTwoFactorService.enableTwoFactor.mockResolvedValue(expected);

      const result = await controller.enable(dto, 'user-1');

      expect(result).toEqual(expected);
    });
  });

  describe('status', () => {
    it('should delegate to twoFactorService.isTwoFactorEnabled with userId', async () => {
      mockTwoFactorService.isTwoFactorEnabled.mockResolvedValue(true);

      await controller.status('user-1');

      expect(twoFactorService.isTwoFactorEnabled).toHaveBeenCalledWith('user-1');
    });

    it('should return { isEnabled: true } when 2FA is enabled', async () => {
      mockTwoFactorService.isTwoFactorEnabled.mockResolvedValue(true);

      const result = await controller.status('user-1');

      expect(result).toEqual({ isEnabled: true });
    });

    it('should return { isEnabled: false } when 2FA is disabled', async () => {
      mockTwoFactorService.isTwoFactorEnabled.mockResolvedValue(false);

      const result = await controller.status('user-1');

      expect(result).toEqual({ isEnabled: false });
    });
  });

  describe('disable', () => {
    it('should delegate to twoFactorService.disableTwoFactor with userId and code', async () => {
      const dto: Disable2FADto = { code: '123456' };
      mockTwoFactorService.disableTwoFactor.mockResolvedValue(undefined);

      await controller.disable(dto, 'user-1');

      expect(twoFactorService.disableTwoFactor).toHaveBeenCalledWith(
        'user-1',
        '123456',
      );
    });

    it('should return a success message', async () => {
      const dto: Disable2FADto = { code: '123456' };
      mockTwoFactorService.disableTwoFactor.mockResolvedValue(undefined);

      const result = await controller.disable(dto, 'user-1');

      expect(result).toEqual({
        message: 'Two-factor authentication disabled',
      });
    });

    it('should propagate exceptions from twoFactorService', async () => {
      const dto: Disable2FADto = { code: '000000' };
      mockTwoFactorService.disableTwoFactor.mockRejectedValue(
        new Error('Invalid 2FA code'),
      );

      await expect(controller.disable(dto, 'user-1')).rejects.toThrow(
        'Invalid 2FA code',
      );
    });
  });
});

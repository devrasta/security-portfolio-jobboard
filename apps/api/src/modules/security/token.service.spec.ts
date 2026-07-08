import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenService],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateRandomToken', () => {
    it('should return a 64-character hex string by default', () => {
      const token = service.generateRandomToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should return correct length for custom byte count', () => {
      const token = service.generateRandomToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should return unique values on successive calls', () => {
      const token1 = service.generateRandomToken();
      const token2 = service.generateRandomToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateVerificationToken', () => {
    it('should return a 64-character hex string', () => {
      const token = service.generateVerificationToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('generateResetToken', () => {
    it('should return a 64-character hex string', () => {
      const token = service.generateResetToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('generateShortCode', () => {
    it('should return a 6-digit string by default', () => {
      const code = service.generateShortCode();
      expect(code).toHaveLength(6);
    });

    it('should return only numeric characters', () => {
      const code = service.generateShortCode();
      expect(code).toMatch(/^\d+$/);
    });

    it('should return a string of the specified length', () => {
      const code = service.generateShortCode(8);
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^\d+$/);
    });

    it('should return unique values on successive calls', () => {
      const codes = new Set(
        Array.from({ length: 10 }, () => service.generateShortCode()),
      );
      expect(codes.size).toBeGreaterThan(1);
    });
  });

  describe('generateUUID', () => {
    it('should return a valid UUID v4 string', () => {
      const uuid = service.generateUUID();
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it('should return unique values on successive calls', () => {
      const uuid1 = service.generateUUID();
      const uuid2 = service.generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('hashToken', () => {
    it('should return a 64-character hex string (SHA-256)', () => {
      const hash = service.hashToken('test-token');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('should be deterministic for the same input', () => {
      const hash1 = service.hashToken('same-token');
      const hash2 = service.hashToken('same-token');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = service.hashToken('token-a');
      const hash2 = service.hashToken('token-b');
      expect(hash1).not.toBe(hash2);
    });
  });
});

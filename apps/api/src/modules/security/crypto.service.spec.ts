import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service';

// Valid 32-byte key (64 hex chars)
const VALID_KEY = 'a'.repeat(64);

describe('CryptoService', () => {
  let service: CryptoService;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    configService = { get: jest.fn().mockReturnValue(VALID_KEY) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptoService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize successfully with a valid 64-hex-char key', () => {
      expect(() => service.onModuleInit()).not.toThrow();
    });

    it('should throw when ENCRYPTION_KEY is not set', async () => {
      configService.get.mockReturnValue(undefined);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CryptoService,
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();
      const svc = module.get<CryptoService>(CryptoService);

      expect(() => svc.onModuleInit()).toThrow('ENCRYPTION_KEY not found');
    });

    it('should throw when ENCRYPTION_KEY is not 32 bytes', async () => {
      configService.get.mockReturnValue('abcd1234'); // Only 4 bytes

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CryptoService,
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();
      const svc = module.get<CryptoService>(CryptoService);

      expect(() => svc.onModuleInit()).toThrow('must be 32 bytes');
    });
  });

  describe('encrypt', () => {
    it('should return a string in iv:authTag:encrypted format', () => {
      const result = service.encrypt('hello');
      const parts = result.split(':');
      expect(parts).toHaveLength(3);
    });

    it('should produce different ciphertext for the same plaintext (random IV)', () => {
      const e1 = service.encrypt('same');
      const e2 = service.encrypt('same');
      expect(e1).not.toBe(e2);
    });

    it('should have 32 hex char IV (16 bytes)', () => {
      const result = service.encrypt('test');
      const iv = result.split(':')[0];
      expect(iv).toHaveLength(32);
      expect(iv).toMatch(/^[0-9a-f]+$/);
    });

    it('should have 32 hex char auth tag (16 bytes)', () => {
      const result = service.encrypt('test');
      const authTag = result.split(':')[1];
      expect(authTag).toHaveLength(32);
      expect(authTag).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('decrypt', () => {
    it('should correctly decrypt data encrypted by encrypt()', () => {
      const encrypted = service.encrypt('hello world');
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe('hello world');
    });

    it('should throw when ciphertext is tampered with', () => {
      const encrypted = service.encrypt('test');
      const parts = encrypted.split(':');
      parts[2] = 'ff' + parts[2].slice(2); // tamper encrypted data
      expect(() => service.decrypt(parts.join(':'))).toThrow();
    });

    it('should throw when auth tag is tampered with', () => {
      const encrypted = service.encrypt('test');
      const parts = encrypted.split(':');
      parts[1] = 'ff' + parts[1].slice(2); // tamper auth tag
      expect(() => service.decrypt(parts.join(':'))).toThrow();
    });
  });

  describe('encrypt/decrypt round-trip', () => {
    it('should round-trip a simple string', () => {
      expect(service.decrypt(service.encrypt('hello'))).toBe('hello');
    });

    it('should round-trip an empty string', () => {
      expect(service.decrypt(service.encrypt(''))).toBe('');
    });

    it('should round-trip a long string', () => {
      const long = 'x'.repeat(10000);
      expect(service.decrypt(service.encrypt(long))).toBe(long);
    });

    it('should round-trip JSON content', () => {
      const json = JSON.stringify({ key: 'value', num: 42 });
      expect(service.decrypt(service.encrypt(json))).toBe(json);
    });

    it('should round-trip unicode content', () => {
      const unicode = 'Bonjour le monde! \u00e9\u00e8\u00ea\u00eb';
      expect(service.decrypt(service.encrypt(unicode))).toBe(unicode);
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate 10 codes by default', () => {
      const codes = service.generateBackupCodes();
      expect(codes).toHaveLength(10);
    });

    it('should generate the specified number of codes', () => {
      const codes = service.generateBackupCodes(5);
      expect(codes).toHaveLength(5);
    });

    it('should return codes in XXXX-XXXX format', () => {
      const codes = service.generateBackupCodes();
      for (const code of codes) {
        expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
      }
    });

    it('should return unique codes', () => {
      const codes = service.generateBackupCodes();
      const unique = new Set(codes);
      expect(unique.size).toBe(codes.length);
    });
  });

  describe('encryptBackupCodes / decryptBackupCodes', () => {
    it('should encrypt codes to a non-JSON string', () => {
      const codes = ['AAAA-BBBB', 'CCCC-DDDD'];
      const encrypted = service.encryptBackupCodes(codes);
      expect(encrypted).not.toBe(JSON.stringify(codes));
      expect(encrypted).toContain(':'); // iv:authTag:encrypted format
    });

    it('should round-trip an array of backup codes', () => {
      const codes = service.generateBackupCodes();
      const encrypted = service.encryptBackupCodes(codes);
      const decrypted = service.decryptBackupCodes(encrypted);
      expect(decrypted).toEqual(codes);
    });

    it('should round-trip an empty array', () => {
      const encrypted = service.encryptBackupCodes([]);
      const decrypted = service.decryptBackupCodes(encrypted);
      expect(decrypted).toEqual([]);
    });

    it('should throw on corrupted encrypted data', () => {
      expect(() => service.decryptBackupCodes('invalid:data:here')).toThrow();
    });
  });
});

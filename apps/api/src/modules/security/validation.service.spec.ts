import { Test, TestingModule } from '@nestjs/testing';
import { ValidationService } from './validation.service';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationService],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isValidEmail', () => {
    it('should return true for a standard email', () => {
      expect(service.isValidEmail('user@example.com')).toBe(true);
    });

    it('should return true for email with subdomain', () => {
      expect(service.isValidEmail('user@mail.example.com')).toBe(true);
    });

    it('should return true for email with plus addressing', () => {
      expect(service.isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should return true for email with dots in local part', () => {
      expect(service.isValidEmail('first.last@example.com')).toBe(true);
    });

    it('should return false for email without @', () => {
      expect(service.isValidEmail('userexample.com')).toBe(false);
    });

    it('should return false for email without domain', () => {
      expect(service.isValidEmail('user@')).toBe(false);
    });

    it('should return false for email without local part', () => {
      expect(service.isValidEmail('@example.com')).toBe(false);
    });

    it('should return false for email with spaces', () => {
      expect(service.isValidEmail('user @example.com')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(service.isValidEmail('')).toBe(false);
    });

    it('should return false for email with multiple @ symbols', () => {
      expect(service.isValidEmail('a@b@c.com')).toBe(false);
    });
  });

  describe('isStrongPassword', () => {
    it('should return true for password meeting all criteria', () => {
      expect(service.isStrongPassword('StrongPass1@ab')).toBe(true);
    });

    it('should return false for password shorter than 12 characters', () => {
      expect(service.isStrongPassword('Strong1@')).toBe(false);
    });

    it('should return false for password without uppercase', () => {
      expect(service.isStrongPassword('weakpassword1@')).toBe(false);
    });

    it('should return false for password without lowercase', () => {
      expect(service.isStrongPassword('WEAKPASSWORD1@')).toBe(false);
    });

    it('should return false for password without digit', () => {
      expect(service.isStrongPassword('StrongPassword@')).toBe(false);
    });

    it('should return false for password without special character', () => {
      expect(service.isStrongPassword('StrongPassword1')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(service.isStrongPassword('')).toBe(false);
    });

    it('should return true for password exactly 12 chars with all requirements', () => {
      expect(service.isStrongPassword('Abcdefgh1@ab')).toBe(true);
    });

    it('should return false for special chars not in allowed set', () => {
      expect(service.isStrongPassword('StrongPass1^ab')).toBe(false);
    });
  });

  describe('getPasswordStrength', () => {
    it('should return 0 for empty string', () => {
      expect(service.getPasswordStrength('')).toBe(0);
    });

    it('should return 0 for null/undefined', () => {
      expect(service.getPasswordStrength(null as any)).toBe(0);
      expect(service.getPasswordStrength(undefined as any)).toBe(0);
    });

    it('should return 1 for 8+ chars, no variety', () => {
      expect(service.getPasswordStrength('aaaaaaaa')).toBe(1);
    });

    it('should return 2 for 12+ chars, no variety', () => {
      expect(service.getPasswordStrength('aaaaaaaaaaaa')).toBe(2);
    });

    it('should return 3 for 12+ chars with mixed case', () => {
      expect(service.getPasswordStrength('aaaaaaaaaaaA')).toBe(3);
    });

    it('should return 4 for 12+ chars with mixed case and digit', () => {
      expect(service.getPasswordStrength('aaaaaaaaaaA1')).toBe(4);
    });

    it('should cap at 4 for password meeting all criteria', () => {
      // Raw score: >=8 (+1), >=12 (+1), mixed case (+1), digit (+1), special (+1) = 5 → capped to 4
      expect(service.getPasswordStrength('aaaaaaaaaaA1@')).toBe(4);
    });

    it('should return correct score for short password with variety', () => {
      // "Aa1@" -> length < 8 (+0), mixed case (+1), digit (+1), special (+1) = 3
      expect(service.getPasswordStrength('Aa1@')).toBe(3);
    });
  });

  describe('isValidUrl', () => {
    it('should return true for https URL', () => {
      expect(service.isValidUrl('https://example.com')).toBe(true);
    });

    it('should return true for http URL', () => {
      expect(service.isValidUrl('http://example.com')).toBe(true);
    });

    it('should return true for URL with path and query string', () => {
      expect(service.isValidUrl('https://example.com/path?q=1')).toBe(true);
    });

    it('should return false for plain string without protocol', () => {
      expect(service.isValidUrl('example.com')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(service.isValidUrl('')).toBe(false);
    });

    it('should return false for malformed URL', () => {
      expect(service.isValidUrl('not a url at all')).toBe(false);
    });

    it('should return true for URL with port number', () => {
      expect(service.isValidUrl('http://localhost:3000')).toBe(true);
    });
  });
});

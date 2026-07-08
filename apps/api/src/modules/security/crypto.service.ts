import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService implements OnModuleInit {
  private key: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16;

  constructor(private readonly config: ConfigService) {}

  // ═══════════════════════════════════════════════════════
  // INITIALIZATION (Load key from .env)
  // ═══════════════════════════════════════════════════════

  onModuleInit() {
    // ✅ GET KEY FROM CONFIG (.env)
    const encryptionKey = this.config.get<string>('ENCRYPTION_KEY');

    if (!encryptionKey) {
      throw new Error(
        'ENCRYPTION_KEY not found in .env. ' +
          "Generate: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }

    // ✅ CONVERT HEX STRING TO BUFFER
    this.key = Buffer.from(encryptionKey, 'hex');

    // ✅ VALIDATE LENGTH (32 bytes for AES-256)
    if (this.key.length !== 32) {
      throw new Error(
        `ENCRYPTION_KEY must be 32 bytes (64 hex chars). ` +
          `Current: ${this.key.length} bytes`,
      );
    }

    console.log('✅ CryptoService initialized');
  }

  // ═══════════════════════════════════════════════════════
  // ENCRYPT
  // ═══════════════════════════════════════════════════════

  encrypt(plaintext: string): string {
    // Generate random IV
    const iv = crypto.randomBytes(this.ivLength);

    // Create cipher with this.key
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Return: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  // ═══════════════════════════════════════════════════════
  // DECRYPT
  // ═══════════════════════════════════════════════════════

  decrypt(encryptedData: string): string {
    // Parse
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Create decipher with this.key
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // ═══════════════════════════════════════════════════════
  // GENERATE BACKUP CODES
  // ═══════════════════════════════════════════════════════

  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      const bytes = crypto.randomBytes(4);
      const code = bytes.toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
    }

    return codes;
  }

  // ═══════════════════════════════════════════════════════
  // ENCRYPT BACKUP CODES
  // ═══════════════════════════════════════════════════════

  encryptBackupCodes(codes: string[]): string {
    const json = JSON.stringify(codes);
    return this.encrypt(json);
  }

  decryptBackupCodes(encryptedCodes: string): string[] {
    const json = this.decrypt(encryptedCodes);
    return JSON.parse(json);
  }
}

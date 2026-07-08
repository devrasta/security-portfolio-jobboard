import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class TokenService {
  generateRandomToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  generateVerificationToken(): string {
    return this.generateRandomToken(32);
  }

  generateResetToken(): string {
    return this.generateRandomToken(32);
  }

  generateShortCode(length = 6): string {
    // For 2FA codes
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += digits[crypto.randomInt(0, digits.length)];
    }
    return code;
  }

  generateUUID(): string {
    return crypto.randomUUID();
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

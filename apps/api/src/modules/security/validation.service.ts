import { Injectable } from '@nestjs/common';

@Injectable()
export class ValidationService {
  isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  private static readonly MIN_STRONG_LENGTH = 12;

  // Single source of truth for password criteria, shared by
  // isStrongPassword and getPasswordStrength so they can never disagree.
  private passwordCriteria(password: string) {
    return {
      minLength: password.length >= ValidationService.MIN_STRONG_LENGTH,
      lower: /[a-z]/.test(password),
      upper: /[A-Z]/.test(password),
      digit: /\d/.test(password),
      special: /[@$!%*?&#_\-]/.test(password),
    };
  }

  isStrongPassword(password: string): boolean {
    if (!password) return false;
    return Object.values(this.passwordCriteria(password)).every(Boolean);
  }

  /**
   * Returns a 0–4 score. 4 is returned if and only if isStrongPassword()
   * is true; any password failing at least one criterion is capped at 3.
   */
  getPasswordStrength(password: string): number {
    if (!password) return 0;
    if (this.isStrongPassword(password)) return 4;

    const c = this.passwordCriteria(password);
    let strength = 0;

    // Length checks
    if (password.length >= 8) strength++;
    if (c.minLength) strength++;

    // Character variety checks
    if (c.lower && c.upper) strength++;
    if (c.digit) strength++;
    if (c.special) strength++;

    return Math.min(strength, 3);
  }

  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

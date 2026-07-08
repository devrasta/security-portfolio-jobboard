import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

@Injectable()
export class HashService {
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  }

  async verifyPassword(
    hashedPassword: string,
    password: string,
  ): Promise<boolean> {
    return argon2.verify(hashedPassword, password);
  }

  // ════════════════════════════════════════════════════════
  // TOKEN HASHING (SHA-256 - pour tokens/sessions)
  // ════════════════════════════════════════════════════════

  /**
   * Hash un token avec SHA-256
   * Utilisé pour refresh tokens, session tokens, etc.
   * Plus rapide qu'Argon2 car pas besoin de résistance au brute-force
   * @param token - Le token à hasher
   * @returns Hash SHA-256 hexadécimal (64 caractères)
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Compare deux tokens de manière sécurisée (timing-safe)
   * Évite les attaques par timing attack
   * @param token1 - Premier token
   * @param token2 - Deuxième token
   * @returns true si identiques
   */
  compareTokens(token1: string, token2: string): boolean {
    const hash1 = this.hashToken(token1);
    const hash2 = this.hashToken(token2);

    return crypto.timingSafeEqual(Buffer.from(hash1), Buffer.from(hash2));
  }

  // ════════════════════════════════════════════════════════
  // TOKEN GENERATION
  // ════════════════════════════════════════════════════════

  /**
   * Génère un token aléatoire sécurisé
   * Utile pour reset password, email verification, API keys, etc.
   * @param bytes - Nombre de bytes (default: 32)
   * @returns String hexadécimal
   */
  generateSecureToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex').toUpperCase();
  }
}

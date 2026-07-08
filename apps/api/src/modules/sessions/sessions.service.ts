import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async getActiveSessions(userId: string) {
    const sessions = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        lastUsedAt: true,
        ipAddress: true,
        userAgent: true,
        deviceId: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { data: sessions, total: sessions.length };
  }

  async revokeSession(sessionId: string, userId: string) {
    const token = await this.prisma.refreshToken.findUnique({
      where: { id: sessionId },
    });

    if (!token) {
      throw new NotFoundException('Session not found');
    }

    if (token.userId !== userId) {
      throw new ForbiddenException();
    }

    if (token.isRevoked) {
      throw new NotFoundException('Session already revoked');
    }

    await this.prisma.refreshToken.update({
      where: { id: sessionId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: 'LOGOUT',
      },
    });

    return { message: 'Session revoked' };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { ActivityAction } from '@/modules/prisma/generated/client';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async logActivity(dto: {
    userId: string | null;
    action: ActivityAction;
    ipAddress: string;
    userAgent: string;
  }) {
    let location = {};
    const isLocalIp =
      !dto.ipAddress ||
      dto.ipAddress === '::1' ||
      dto.ipAddress === '127.0.0.1' ||
      dto.ipAddress.startsWith('192.168.') ||
      dto.ipAddress.startsWith('10.') ||
      dto.ipAddress.startsWith('172.');
    if (!isLocalIp) {
      try {
        const response = await fetch(
          `https://ipapi.co/${dto.ipAddress}/json/`,
          { signal: AbortSignal.timeout(2000) },
        );
        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          const data = await response.json();
          location = {
            country: data.country_name,
            city: data.city,
          };
        }
      } catch (error) {
        console.error('Failed to fetch location data:', error);
      }
    }

    return this.prisma.activityLog.create({
      data: {
        userId: dto.userId,
        action: dto.action,
        city: location['city'] || null,
        country: location['country'] || null,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      },
    });
  }

  async getActivityLogs(filters: {
    userId: string;
    action?: ActivityAction;
    limit?: number;
    offset?: number;
  }) {
    const where: {
      userId: string;
      action?: ActivityAction;
    } = { userId: filters.userId };

    if (filters.action) where.action = filters.action;

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return { data: logs, total };
  }

  async getRecentActivity(userId: string, limit = 10) {
    return this.prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

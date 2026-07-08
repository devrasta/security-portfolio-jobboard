import { Test, TestingModule } from '@nestjs/testing';
import { ActivityService } from './activity.service';
import { PrismaService } from '@/modules/prisma/prisma.service';

describe('ActivityService', () => {
  let service: ActivityService;
  let prisma: any;
  let originalFetch: typeof global.fetch;

  const mockPrismaService = {
    activityLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    originalFetch = global.fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logActivity', () => {
    const dto = {
      userId: 'user-1',
      action: 'LOGIN_SUCCESS' as any,
      ipAddress: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    };

    it('should fetch geolocation from ipapi.co', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        json: jest
          .fn()
          .mockResolvedValue({ country_name: 'France', city: 'Paris' }),
      });
      global.fetch = mockFetch;
      prisma.activityLog.create.mockResolvedValue({ id: 'log-1', ...dto });

      await service.logActivity(dto);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://ipapi.co/1.2.3.4/json/',
        expect.objectContaining({ signal: expect.any(Object) }),
      );
    });

    it('should store activity with geolocation data', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest
          .fn()
          .mockResolvedValue({ country_name: 'France', city: 'Paris' }),
      });
      const createdLog = { id: 'log-1' };
      prisma.activityLog.create.mockResolvedValue(createdLog);

      await service.logActivity(dto);

      expect(prisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          userId: dto.userId,
          action: dto.action,
          city: 'Paris',
          country: 'France',
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
        },
      });
    });

    it('should store null location when geolocation fetch fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      prisma.activityLog.create.mockResolvedValue({ id: 'log-1' });

      await service.logActivity(dto);

      expect(prisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          city: null,
          country: null,
        }),
      });
    });

    it('should handle timeout gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('AbortError'));
      prisma.activityLog.create.mockResolvedValue({ id: 'log-1' });

      await expect(service.logActivity(dto)).resolves.toBeDefined();
    });

    it('should return the created activity log', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ country_name: 'US', city: 'NYC' }),
      });
      const createdLog = { id: 'log-1', ...dto };
      prisma.activityLog.create.mockResolvedValue(createdLog);

      const result = await service.logActivity(dto);
      expect(result).toEqual(createdLog);
    });
  });

  describe('getActivityLogs', () => {
    it('should query by userId', async () => {
      prisma.activityLog.findMany.mockResolvedValue([]);
      prisma.activityLog.count.mockResolvedValue(0);

      await service.getActivityLogs({ userId: 'user-1' });

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        }),
      );
    });

    it('should include action filter when provided', async () => {
      prisma.activityLog.findMany.mockResolvedValue([]);
      prisma.activityLog.count.mockResolvedValue(0);

      await service.getActivityLogs({
        userId: 'user-1',
        action: 'LOGIN_SUCCESS' as any,
      });

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', action: 'LOGIN_SUCCESS' },
        }),
      );
    });

    it('should not include action when not provided', async () => {
      prisma.activityLog.findMany.mockResolvedValue([]);
      prisma.activityLog.count.mockResolvedValue(0);

      await service.getActivityLogs({ userId: 'user-1' });

      const call = prisma.activityLog.findMany.mock.calls[0][0];
      expect(call.where).not.toHaveProperty('action');
    });

    it('should use default limit of 50 and offset of 0', async () => {
      prisma.activityLog.findMany.mockResolvedValue([]);
      prisma.activityLog.count.mockResolvedValue(0);

      await service.getActivityLogs({ userId: 'user-1' });

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        }),
      );
    });

    it('should use provided limit and offset', async () => {
      prisma.activityLog.findMany.mockResolvedValue([]);
      prisma.activityLog.count.mockResolvedValue(0);

      await service.getActivityLogs({
        userId: 'user-1',
        limit: 10,
        offset: 20,
      });

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });

    it('should order by createdAt desc', async () => {
      prisma.activityLog.findMany.mockResolvedValue([]);
      prisma.activityLog.count.mockResolvedValue(0);

      await service.getActivityLogs({ userId: 'user-1' });

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should return { data, total } structure', async () => {
      const logs = [{ id: 'log-1' }];
      prisma.activityLog.findMany.mockResolvedValue(logs);
      prisma.activityLog.count.mockResolvedValue(1);

      const result = await service.getActivityLogs({ userId: 'user-1' });

      expect(result).toEqual({ data: logs, total: 1 });
    });

    it('should return empty data and 0 total when no logs exist', async () => {
      prisma.activityLog.findMany.mockResolvedValue([]);
      prisma.activityLog.count.mockResolvedValue(0);

      const result = await service.getActivityLogs({ userId: 'user-1' });

      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  describe('getRecentActivity', () => {
    it('should query by userId and order desc', async () => {
      prisma.activityLog.findMany.mockResolvedValue([]);

      await service.getRecentActivity('user-1');

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });

    it('should use default limit of 10', async () => {
      prisma.activityLog.findMany.mockResolvedValue([]);

      await service.getRecentActivity('user-1');

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it('should use provided limit', async () => {
      prisma.activityLog.findMany.mockResolvedValue([]);

      await service.getRecentActivity('user-1', 5);

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });

    it('should return an array of activity logs', async () => {
      const logs = [{ id: 'log-1' }, { id: 'log-2' }];
      prisma.activityLog.findMany.mockResolvedValue(logs);

      const result = await service.getRecentActivity('user-1');
      expect(result).toEqual(logs);
    });

    it('should return empty array when no activity exists', async () => {
      prisma.activityLog.findMany.mockResolvedValue([]);
      const result = await service.getRecentActivity('user-1');
      expect(result).toEqual([]);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from './sessions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SessionsService', () => {
  let service: SessionsService;
  let prisma: any;

  const mockPrismaService = {
    refreshToken: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActiveSessions', () => {
    it('should query with userId, isRevoked:false, and non-expired filter', async () => {
      prisma.refreshToken.findMany.mockResolvedValue([]);

      await service.getActiveSessions('user-1');

      expect(prisma.refreshToken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            isRevoked: false,
            expiresAt: expect.objectContaining({ gt: expect.any(Date) }),
          }),
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should return data array and total', async () => {
      const sessions = [
        { id: 's1', userId: 'user-1', isRevoked: false },
        { id: 's2', userId: 'user-1', isRevoked: false },
      ];
      prisma.refreshToken.findMany.mockResolvedValue(sessions);

      const result = await service.getActiveSessions('user-1');
      expect(result).toEqual({ data: sessions, total: 2 });
    });

    it('should return empty data and zero total when no active sessions', async () => {
      prisma.refreshToken.findMany.mockResolvedValue([]);
      const result = await service.getActiveSessions('user-1');
      expect(result).toEqual({ data: [], total: 0 });
    });
  });
});

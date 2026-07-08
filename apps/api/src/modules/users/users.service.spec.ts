import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test',
      password: '$hash',
      createdAt: new Date(),
    };

    it('should call prisma with correct where and select', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await service.findByEmail('test@example.com');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        select: {
          id: true,
          email: true,
          name: true,
          password: true,
          twoFactorEnabled: true,
          createdAt: true,
        },
        where: { email: 'test@example.com' },
      });
    });

    it('should return the user when found', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.findByEmail('test@example.com');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.findByEmail('unknown@example.com');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test',
      password: '$hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should call prisma with id in where clause', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await service.findById('user-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should return the full user object', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.findById('user-1');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    const createDto = {
      email: 'new@example.com',
      password: '$hashed',
      name: 'New User',
      emailVerificationToken: 'abc123token',
    };

    it('should check for existing user before creating', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        email: createDto.email,
        name: createDto.name,
      });

      await service.createUser(createDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        select: expect.any(Object),
        where: { email: createDto.email },
      });
    });

    it('should throw ConflictException when email is taken', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.createUser(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createUser(createDto)).rejects.toThrow(
        'User already exists',
      );
    });

    it('should not call prisma.user.create if user already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.createUser(createDto)).rejects.toThrow();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should create user with correct data and select', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        email: createDto.email,
        name: createDto.name,
      });

      await service.createUser(createDto);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: createDto,
        select: { email: true, name: true },
      });
    });

    it('should return the created user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const expected = { email: createDto.email, name: createDto.name };
      prisma.user.create.mockResolvedValue(expected);

      const result = await service.createUser(createDto);
      expect(result).toEqual(expected);
    });
  });

  describe('getUserRefreshTokens', () => {
    it('should query with userId and isRevoked:false', async () => {
      prisma.refreshToken.findMany.mockResolvedValue([]);

      await service.getUserRefreshTokens('user-1');

      expect(prisma.refreshToken.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', AND: { isRevoked: false } },
      });
    });

    it('should return array of non-revoked tokens', async () => {
      const tokens = [{ id: 'token-1' }, { id: 'token-2' }];
      prisma.refreshToken.findMany.mockResolvedValue(tokens);

      const result = await service.getUserRefreshTokens('user-1');
      expect(result).toEqual(tokens);
    });

    it('should return empty array when no active tokens', async () => {
      prisma.refreshToken.findMany.mockResolvedValue([]);
      const result = await service.getUserRefreshTokens('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('updatePassword', () => {
    it('should call prisma.user.update with userId and hashed password', async () => {
      prisma.user.update.mockResolvedValue({});

      await service.updatePassword('user-1', '$new-hash');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { password: '$new-hash' },
      });
    });

    it('should return void', async () => {
      prisma.user.update.mockResolvedValue({});
      const result = await service.updatePassword('user-1', '$hash');
      expect(result).toBeUndefined();
    });
  });
});

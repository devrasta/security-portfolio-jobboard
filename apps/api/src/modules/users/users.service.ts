import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserModel as User } from '@/modules/prisma/generated/models';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<Partial<User>> {
    return this.prisma.user.findUnique({
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
      where: {
        email: email,
      },
    });
  }

  async findById(id: string): Promise<User> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async createUser(user: CreateUserDto) {
    const existingUser = await this.findByEmail(user.email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const createdUser = await this.prisma.user.create({
      data: user,
      select: {
        email: true,
        name: true,
      },
    });

    return createdUser;
  }

  async getUserRefreshTokens(userId: string) {
    return this.prisma.refreshToken.findMany({
      where: { userId, AND: { isRevoked: false } },
    });
  }
  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        password: hashedPassword,
      },
    });
  }

  async toggleTwoFactor(
    userId: string,
    enabled: boolean,
  ): Promise<{ twoFactorEnabled: boolean }> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: enabled },
      select: { twoFactorEnabled: true },
    });
    return updated;
  }

  async getProfile(userId: string): Promise<Partial<User>> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });
  }
}

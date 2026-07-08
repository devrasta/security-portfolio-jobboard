import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '@/modules/users/users.module';
import { SecurityModule } from '@/modules/security/security.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ActivityModule } from '../activity/activity.module';
import { TwoFactorController } from './two-factor.controller';
import { TwoFactorService } from './two-factor.service';

@Module({
  imports: [UsersModule, SecurityModule, PrismaModule, ActivityModule],
  controllers: [AuthController, TwoFactorController],
  providers: [AuthService, TwoFactorService],
  exports: [AuthService],
})
export class AuthModule {}

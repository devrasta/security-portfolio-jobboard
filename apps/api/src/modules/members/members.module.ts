import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [PrismaModule, MailModule, SecurityModule],
  controllers: [MembersController],
  providers: [MembersService],
})
export class MembersModule {}

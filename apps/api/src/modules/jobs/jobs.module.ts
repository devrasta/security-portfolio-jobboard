import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { PublicJobsController } from './public-jobs.controller';
import { JobsService } from './jobs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [PrismaModule, MailModule, SecurityModule],
  controllers: [JobsController, PublicJobsController],
  providers: [JobsService],
})
export class JobsModule {}

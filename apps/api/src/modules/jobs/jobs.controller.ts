import { Implement, implement } from '@orpc/nest';
import { contract } from '@repo/contracts';
import {
  Controller,
  Post,
  Get,
  UseGuards,
  Req,
  Patch,
  Delete,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../security/guards/jwt-auth.guard';
import type { Request } from 'express';
import { CompanyMemberGuard } from '../../common/guards/company-member.guard';
import { RequiredRole } from '../../common/decorators/required-role.decorator';

@Controller('/companies/:companyId/jobs')
@UseGuards(JwtAuthGuard, CompanyMemberGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @Implement(contract.jobs.create)
  async createJob(@Req() req: Request) {
    return implement(contract.jobs.create).handler(({ input }) => {
      const { companyId, title, location, description, status } = input;
      const currentUserId = req.user.userId;
      return this.jobsService.createJob({
        companyId,
        title,
        location,
        description,
        currentUserId,
        status,
      });
    });
  }

  @Get()
  @Implement(contract.jobs.get)
  async getJobs() {
    return implement(contract.jobs.get).handler(({ input }) => {
      const { companyId } = input;
      return this.jobsService.getJobs(companyId);
    });
  }

  @Get('/:jobId')
  @Implement(contract.jobs.getById)
  async getJob() {
    return implement(contract.jobs.getById).handler(({ input }) => {
      const { jobId } = input;
      return this.jobsService.getJob(jobId);
    });
  }

  @Patch('/:jobId')
  @RequiredRole('ADMIN')
  @Implement(contract.jobs.update)
  async updateJob() {
    return implement(contract.jobs.update).handler(({ input }) => {
      const { jobId, title, location, description, ownerId, status } = input;
      return this.jobsService.updateJob({
        jobId,
        title,
        location,
        description,
        ownerId,
        status,
      });
    });
  }

  @Delete('/:jobId')
  @RequiredRole('OWNER')
  @Implement(contract.jobs.delete)
  async deleteJob() {
    return implement(contract.jobs.delete).handler(({ input }) => {
      const { jobId } = input;
      return this.jobsService.deleteJob(jobId);
    });
  }

  @Post('/:jobId/share')
  @Implement(contract.jobs.generateUrl)
  async generateJobUrl() {
    return implement(contract.jobs.generateUrl).handler(({ input }) => {
      const { jobId } = input;
      return this.jobsService.generateJobUrl(jobId);
    });
  }

  @Post('/:jobId/invite')
  @Implement(contract.jobs.invite)
  async inviteJob() {
    return implement(contract.jobs.invite).handler(({ input }) => {
      return this.jobsService.inviteJob(input);
    });
  }
}

import { Implement, implement } from '@orpc/nest';
import { contract } from '@repo/contracts';
import { Controller, Post, Get, UseGuards, Req } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../security/guards/jwt-auth.guard';
import type { Request } from 'express';

@Controller('/companies/:companyId/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Implement(contract.jobs.create)
  async createJob(@Req() req: Request) {
    return implement(contract.jobs.create).handler(({ input }) => {
      const { companyId, title, location, description } = input;
      const currentUserId = req.user.userId;
      return this.jobsService.createJob(
        companyId,
        title,
        location,
        description,
        currentUserId,
      );
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
  //     POST   /companies/:companyId/jobs             → créer un job (MEMBER+)
  // GET    /companies/:companyId/jobs             → lister les jobs de l'entreprise
  // GET    /companies/:companyId/jobs/:jobId      → voir un job (MEMBER+)
  // PATCH  /companies/:companyId/jobs/:jobId      → modifier (OWNER du job ou ADMIN+)
  // DELETE /companies/:companyId/jobs/:jobId      → supprimer (OWNER du job ou ADMIN+)
}

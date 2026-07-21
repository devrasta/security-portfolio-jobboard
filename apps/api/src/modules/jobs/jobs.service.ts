import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  JOB_WITH_COMPANY_NAME_INCLUDE,
  JobDto,
  JobWithCompanyName,
} from './jobs.dto';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async createJob(
    companyId: string,
    title: string,
    location: string,
    description: string,
    ownerId: string,
  ): Promise<JobDto> {
    const job = await this.prisma.job.create({
      data: {
        companyId,
        title,
        location,
        description,
        ownerId,
        status: 'DRAFT',
      },
      include: JOB_WITH_COMPANY_NAME_INCLUDE,
    });
    return this.toJobDto(job);
  }

  async getJobs(companyId: string): Promise<JobDto[]> {
    const jobs = await this.prisma.job.findMany({
      where: { companyId },
      include: JOB_WITH_COMPANY_NAME_INCLUDE,
    });
    return jobs.map((job) => this.toJobDto(job));
  }

  async getJob(jobId: string): Promise<JobDto> {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: JOB_WITH_COMPANY_NAME_INCLUDE,
    });
    if (!job) {
      throw new Error(`Job with ID ${jobId} not found`);
    }
    return this.toJobDto(job);
  }

  async updateJob(
    jobId: string,
    title?: string,
    location?: string,
    description?: string,
    ownerId?: string,
  ): Promise<JobDto> {
    const job = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        title,
        location,
        description,
        ownerId,
      },
      include: JOB_WITH_COMPANY_NAME_INCLUDE,
    });
    return this.toJobDto(job);
  }

  async deleteJob(jobId: string): Promise<string> {
    try {
      await this.prisma.job.delete({
        where: { id: jobId },
      });
      return `Job with ID ${jobId} has been deleted`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete job with ID ${jobId}: ${message}`);
    }
  }

  private toJobDto(job: JobWithCompanyName): JobDto {
    return {
      id: job.id,
      title: job.title,
      company: job.company.name,
      location: job.location,
      description: job.description,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService, // Assuming you have a JobsRepository for database operations
  ) {}

  async createJob(
    companyId: string,
    title: string,
    location: string,
    description: string,
    ownerId: string,
  ) {
    const job = await this.prisma.job.create({
      data: {
        companyId,
        title,
        location,
        description,
        ownerId,
        status: 'DRAFT',
      },
      include: { company: { select: { name: true } } },
    });
    return {
      id: job.id,
      title: job.title,
      company: job.company.name,
      location: job.location,
      description: job.description,
    };
  }

  async getJobs(companyId: string) {
    const jobs = await this.prisma.job.findMany({
      where: { companyId },
      include: { company: { select: { name: true } } },
    });
    return jobs.map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company.name,
      location: job.location,
      description: job.description,
    }));
  }
}

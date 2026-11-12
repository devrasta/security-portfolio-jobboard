import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateJobDto,
  JOB_WITH_COMPANY_NAME_INCLUDE,
  JobDto,
  JobWithCompanyName,
  UpdateJobDto,
} from './jobs.dto';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../security/token.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    private readonly mailService: MailService,
  ) {}

  async createJob(createJobDto: CreateJobDto): Promise<JobDto> {
    const job = await this.prisma.job.create({
      data: {
        companyId: createJobDto.companyId,
        title: createJobDto.title,
        location: createJobDto.location,
        description: createJobDto.description,
        ownerId: createJobDto.currentUserId,
        status: createJobDto.status ?? 'DRAFT',
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

  // Every job lookup by ID is scoped to the company from the URL: the
  // CompanyMemberGuard only checks membership of :companyId, so without this
  // filter a member of company A could read/edit company B's jobs (IDOR).
  // A job from another company is reported as "not found".

  async getJob(companyId: string, jobId: string): Promise<JobDto> {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, companyId },
      include: JOB_WITH_COMPANY_NAME_INCLUDE,
    });
    if (!job) {
      throw new Error(`Job with ID ${jobId} not found`);
    }
    return this.toJobDto(job);
  }

  async updateJob(updateJobDto: UpdateJobDto): Promise<JobDto> {
    const job = await this.prisma.job.update({
      where: { id: updateJobDto.jobId, companyId: updateJobDto.companyId },
      data: {
        title: updateJobDto.title,
        location: updateJobDto.location,
        description: updateJobDto.description,
        ownerId: updateJobDto.ownerId,
        status: updateJobDto.status,
      },
      include: JOB_WITH_COMPANY_NAME_INCLUDE,
    });
    return this.toJobDto(job);
  }

  async deleteJob(companyId: string, jobId: string): Promise<string> {
    try {
      await this.prisma.job.delete({
        where: { id: jobId, companyId },
      });
      return `Job with ID ${jobId} has been deleted`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete job with ID ${jobId}: ${message}`);
    }
  }

  async generateJobUrl(companyId: string, jobId: string): Promise<string> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, companyId },
      include: JOB_WITH_COMPANY_NAME_INCLUDE,
    });
    if (!job) {
      throw new Error(`Job with ID ${jobId} not found`);
    }

    // Published jobs are public: direct link to the public job page
    // (no token, no auth). Drafts/archived go through an expiring token.
    if (job.status === 'PUBLISHED') {
      return `${frontendUrl}/jobs/public/${jobId}`;
    }

    if (
      !job.shareToken ||
      !job.shareTokenExpiresAt ||
      job.shareTokenExpiresAt < new Date()
    ) {
      const shareToken = this.tokenService.generateRandomToken(16);

      await this.prisma.job.update({
        where: { id: job.id },
        data: {
          shareToken,
          shareTokenExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      });

      return `${frontendUrl}/jobs/shared/${shareToken}`;
    } else {
      return `${frontendUrl}/jobs/shared/${job.shareToken}`;
    }
  }

  /**
   * Invalidates the job's share token: any /jobs/shared/:token link stops
   * working immediately. A new link can be generated afterwards.
   * Note: a PUBLISHED job stays reachable at /jobs/public/:jobId — only
   * unpublishing it removes that access.
   */
  async revokeLink(companyId: string, jobId: string): Promise<string> {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, companyId },
      select: { id: true, shareToken: true },
    });
    if (!job) {
      throw new Error(`Job with ID ${jobId} not found`);
    }
    if (!job.shareToken) {
      return 'No active share link for this job';
    }

    await this.prisma.job.update({
      where: { id: job.id },
      data: { shareToken: null, shareTokenExpiresAt: null },
    });
    return 'Share link has been revoked';
  }

  async listPublicJobs(): Promise<JobDto[]> {
    const jobs = await this.prisma.job.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      include: JOB_WITH_COMPANY_NAME_INCLUDE,
    });
    return jobs.map((job) => this.toJobDto(job));
  }

  async getPublicJob(jobId: string): Promise<JobDto> {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, status: 'PUBLISHED' },
      include: JOB_WITH_COMPANY_NAME_INCLUDE,
    });

    if (!job) {
      throw new Error('Job not found');
    }

    return this.toJobDto(job);
  }

  async getSharedJobByToken(shareToken: string): Promise<JobDto> {
    const job = await this.prisma.job.findFirst({
      where: {
        shareToken,
        shareTokenExpiresAt: { gte: new Date() },
      },
      include: JOB_WITH_COMPANY_NAME_INCLUDE,
    });

    if (!job) {
      throw new Error('Invalid or expired share token');
    }

    return this.toJobDto(job);
  }

  async getJobByInviteToken(inviteToken: string): Promise<JobDto> {
    const invite = await this.prisma.jobInvite.findFirst({
      where: {
        token: inviteToken,
        status: 'PENDING',
        expiresAt: { gte: new Date() },
      },
      include: { job: { include: JOB_WITH_COMPANY_NAME_INCLUDE } },
    });

    if (!invite) {
      throw new Error('Invalid or expired invitation token');
    }

    return this.toJobDto(invite.job);
  }

  async inviteJob(inviteJobDto: {
    companyId: string;
    jobId: string;
    email: string;
  }): Promise<string> {
    const job = await this.prisma.job.findFirst({
      where: { id: inviteJobDto.jobId, companyId: inviteJobDto.companyId },
      include: JOB_WITH_COMPANY_NAME_INCLUDE,
    });

    if (!job) {
      throw new Error(`Job with ID ${inviteJobDto.jobId} not found`);
    }

    try {
      const invitationToken = this.tokenService.generateRandomToken(16);
      await this.prisma.jobInvite.create({
        data: {
          jobId: job.id,
          email: inviteJobDto.email,
          token: invitationToken,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
        },
      });
      try {
        const invitationLink = `${this.configService.get<string>('FRONTEND_URL')}/invite?token=${invitationToken}`;

        await this.mailService.sendJobInviteEmail({
          to: inviteJobDto.email,
          jobTitle: job.title,
          companyName: job.company.name,
          jobInvitationLink: invitationLink,
        });
      } catch (error) {
        throw new Error(
          `Failed to send invitation email: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } catch (error) {
      throw new Error(
        `Failed to create job invitation: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return `Invitation sent to ${inviteJobDto.email} for job ${job.title}`;
  }

  private toJobDto(job: JobWithCompanyName): JobDto {
    return {
      id: job.id,
      title: job.title,
      company: job.company.name,
      location: job.location,
      description: job.description,
      status: job.status,
    };
  }
}

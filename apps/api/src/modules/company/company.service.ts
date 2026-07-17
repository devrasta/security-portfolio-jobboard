import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyRole } from '../prisma/generated/enums';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async createCompany(name: string, userId: string, users?: { id: string }[]) {
    const memberIds = (users?.map((u) => u.id) || []).filter(
      (id) => id !== userId,
    );

    try {
      await this.prisma.company.create({
        data: {
          name,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          users: {
            create: [
              { userId, role: CompanyRole.OWNER },
              ...memberIds.map((id) => ({
                userId: id,
                role: CompanyRole.MEMBER,
              })),
            ],
          },
        },
      });

      return `Company created with name: ${name}`;
    } catch (error) {
      console.error('Error creating company:', error);
      throw new Error('Failed to create company');
    }
  }

  async getCompany(id: string) {
    try {
      const company = await this.prisma.company.findUnique({
        where: { id },
        include: {
          users: {
            select: {
              role: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!company) {
        throw new Error('Company not found');
      }
      return company;
    } catch (error) {
      console.error('Error fetching company:', error);
      throw new Error('Failed to fetch company');
    }
  }

  async deleteCompany(id: string) {
    try {
      // Les relations n'ont pas de onDelete: Cascade : on supprime les
      // dépendances dans la même transaction avant la company.
      await this.prisma.$transaction([
        this.prisma.jobInvite.deleteMany({ where: { job: { companyId: id } } }),
        this.prisma.job.deleteMany({ where: { companyId: id } }),
        this.prisma.companyInvite.deleteMany({ where: { companyId: id } }),
        this.prisma.companyUser.deleteMany({ where: { companyId: id } }),
        this.prisma.company.delete({ where: { id } }),
      ]);
      return `Company deleted with ID: ${id}`;
    } catch (error) {
      console.error('Error deleting company:', error);
      throw new Error('Failed to delete company');
    }
  }
}

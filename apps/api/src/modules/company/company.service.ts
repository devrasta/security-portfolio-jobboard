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
}

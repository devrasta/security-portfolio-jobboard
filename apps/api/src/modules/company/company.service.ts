import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  createCompany(name: string, userId: string, users?: { id: string }[]) {
    // Implement the logic to create a company and associate users
    // this.prisma.
    return `Company created with name: ${name} and users: ${userId} + ${users ?? []}`;
  }
}

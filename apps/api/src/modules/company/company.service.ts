import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompanyService {
    constructor(private readonly prisma: PrismaService) {}

    createCompany(name: string, users?: { email: string }[]) {
        // Implement the logic to create a company and associate users
        return `Company created with name: ${name} and users: ${(users ?? []).map(u => u.email).join(', ')}`;
    }

}

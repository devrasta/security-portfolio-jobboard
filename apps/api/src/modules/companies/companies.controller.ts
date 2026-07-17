import { Controller, Post, Get, Delete, UseGuards, Req } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { Implement, implement } from '@orpc/nest';
import { contract } from '@repo/contracts';
import { JwtAuthGuard } from '../security/guards/jwt-auth.guard';
import type { Request, Response } from 'express';
import { CompanyMemberGuard } from '../../common/guards/company-member.guard';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companyService: CompaniesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @Implement(contract.companies.create)
  async createCompany(@Req() req: Request) {
    return implement(contract.companies.create).handler(({ input }) => {
      const { name, users } = input;
      const userId = req.user.userId;
      return this.companyService.createCompany(name, userId, users);
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @Implement(contract.companies.list)
  async listCompanies(@Req() req: Request) {
    return implement(contract.companies.list).handler(() => {
      const userId = req.user.userId;
      return this.companyService.listCompaniesForUser(userId);
    });
  }

  @Get(':companyId')
  @UseGuards(JwtAuthGuard, CompanyMemberGuard)
  @Implement(contract.companies.get)
  async getCompany() {
    return implement(contract.companies.get).handler(({ input }) => {
      const { companyId } = input;
      return this.companyService.getCompany(companyId);
    });
  }

  @Delete(':companyId')
  @UseGuards(JwtAuthGuard, CompanyMemberGuard)
  @Implement(contract.companies.delete)
  async deleteCompany() {
    return implement(contract.companies.delete).handler(({ input }) => {
      const { companyId } = input;
      return this.companyService.deleteCompany(companyId);
    });
  }
}

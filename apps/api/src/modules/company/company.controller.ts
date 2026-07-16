import { Controller, Post, Get, Delete, UseGuards, Req } from '@nestjs/common';
import { CompanyService } from './company.service';
import { Implement, implement } from '@orpc/nest';
import { contract } from '@repo/contracts';
import { JwtAuthGuard } from '../security/guards/jwt-auth.guard';
import type { Request, Response } from 'express';
import { CompanyMemberGuard } from '../../common/guards/company-member.guard';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @Implement(contract.company.create)
  async createCompany(@Req() req: Request) {
    return implement(contract.company.create).handler(({ input }) => {
      const { name, users } = input;
      const userId = req.user.userId;
      return this.companyService.createCompany(name, userId, users);
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, CompanyMemberGuard)
  @Implement(contract.company.get)
  async getCompany() {
    return implement(contract.company.get).handler(({ input }) => {
      const { id } = input;
      return this.companyService.getCompany(id);
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, CompanyMemberGuard)
  @Implement(contract.company.delete)
  async deleteCompany() {
    return implement(contract.company.delete).handler(({ input }) => {
      const { id } = input;
      return this.companyService.deleteCompany(id);
    });
  }
}

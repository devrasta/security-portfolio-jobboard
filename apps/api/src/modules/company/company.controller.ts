import { Controller, Post, Get, Param, Delete, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { CompanyService } from './company.service';
import { Implement, implement } from "@orpc/nest"
import { contract } from "@repo/contracts"
import { JwtAuthGuard } from '../security/guards/jwt-auth.guard';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @UseGuards(JwtAuthGuard)
  @SkipThrottle() // TODO retirer cette ligne une fois que le guard est en place
  @Post()
  @Implement(contract.company.create)
  async createCompany() {
    return implement(contract.company.create).handler(({ input }) => {
      const { name, users } = input;
      return this.companyService.createCompany(name, users);
    });
  }

  @Get(':id')
  // @Implement(contract.company.get)
  async getCompany(@Param('id') id: string) {
    return `Company info for ID: ${id}`;
  }

  @Delete(':id')
  // @Implement(contract.company.delete)
  async deleteCompany(@Param('id') id: string) {
    return `Company deleted for ID: ${id}`;
  }
}

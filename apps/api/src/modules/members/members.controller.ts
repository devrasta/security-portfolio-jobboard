import {
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { Implement, implement } from '@orpc/nest';
import { contract } from '@repo/contracts';
import { JwtAuthGuard } from '../security/guards/jwt-auth.guard';
import { CompanyMemberGuard } from '../../common/guards/company-member.guard';
import type { Request } from 'express';
import { RequiredRole } from '../../common/decorators/required-role.decorator';

@Controller('companies/:companyId/members')
@UseGuards(JwtAuthGuard, CompanyMemberGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post('invite')
  @RequiredRole('ADMIN')
  @Implement(contract.companies.inviteMember)
  async inviteMember(@Req() req: Request) {
    return implement(contract.companies.inviteMember).handler(({ input }) => {
      const { companyId, email, role } = input;
      const currentUserId = req.user.userId;
      return this.membersService.inviteMember(
        companyId,
        email,
        currentUserId,
        role,
      );
    });
  }

  @Patch(':userId')
  @RequiredRole('OWNER')
  @Implement(contract.companies.changeMemberRole)
  async changeMemberRole() {
    return implement(contract.companies.changeMemberRole).handler(
      ({ input }) => {
        const { companyId, userId, role } = input;
        return this.membersService.changeMemberRole(companyId, userId, role);
      },
    );
  }

  @Delete(':userId')
  @RequiredRole('OWNER')
  @Implement(contract.companies.removeMember)
  async removeMember() {
    return implement(contract.companies.removeMember).handler(({ input }) => {
      const { companyId, userId } = input;
      return this.membersService.removeMember(companyId, userId);
    });
  }

  @Get()
  @Implement(contract.companies.listMembers)
  async listMembers() {
    return implement(contract.companies.listMembers).handler(({ input }) => {
      const { companyId } = input;
      return this.membersService.listMembers(companyId);
    });
  }
}

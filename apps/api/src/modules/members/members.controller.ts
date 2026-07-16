import {
  Controller,
  ForbiddenException,
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

@Controller('company')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @UseGuards(JwtAuthGuard, CompanyMemberGuard)
  @Post(':id/members')
  @Implement(contract.company.inviteMember)
  async inviteMember(@Req() req: Request) {
    return implement(contract.company.inviteMember).handler(({ input }) => {
      const { id: companyId, email } = input;
      const role = req.membership?.role;
      if (role !== 'OWNER' && role !== 'ADMIN') {
        throw new ForbiddenException();
      }
      return this.membersService.inviteMember(companyId, email);
    });
  }

  // PATCH  /tenants/:id/members/:userId  → changer le rôle (OWNER seulement)
  // DELETE /tenants/:id/members/:userId  → retirer un membre (OWNER/ADMIN)
  // GET    /tenants/:id/members          → lister les membres
}

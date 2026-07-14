import { Controller, Post, Patch, Delete, Get, Req } from '@nestjs/common';
import { MembersService } from './members.service';
import { PrismaService } from '../prisma/prisma.service';
import { Implement, implement } from '@orpc/nest';

@Controller('company')
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly prismaService: PrismaService,
  ) {}
  //   POST   /tenants/:id/members          → inviter un membre (OWNER/ADMIN)
  // PATCH  /tenants/:id/members/:userId  → changer le rôle (OWNER seulement)
  // DELETE /tenants/:id/members/:userId  → retirer un membre (OWNER/ADMIN)
  // GET    /tenants/:id/members          → lister les membres

  @Post(':id/members')
  async inviteMember() {}
  // @UseGuards(JwtAuthGuard)
  //   @Post()
  //   @Implement(contract.company.create)
  //   async createCompany(@Req() req: Request) {
  //     return implement(contract.company.create).handler(({ input }) => {
  //       const { name, users } = input;
  //       const userId = req.user.userId;
  //       return this.companyService.createCompany(name, userId, users);
  //     });
  //   }
}

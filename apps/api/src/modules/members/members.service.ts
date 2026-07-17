import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from '../security/token.service';
import { CompanyRole } from '../prisma/generated/enums';
import { MailService } from '../mail/mail.service';

export interface ICompanyMember {
  userId: string;
  email: string;
  role: CompanyRole;
}

@Injectable()
export class MembersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tokenService: TokenService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}
  async inviteMember(
    companyId: string,
    userEmail: string,
    currentUserId: string,
    userRole: CompanyRole,
  ): Promise<string> {
    const company = await this.prismaService.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Logic to invite a member to the company
    const generatedToken = this.tokenService.generateUUID();
    // Un token d'invitation est généré (UUID v4, signé, TTL 48h) et stocké en DB avec le statut PENDING
    await this.prismaService.companyInvite.create({
      data: {
        email: userEmail,
        token: generatedToken,
        status: 'PENDING',
        company: { connect: { id: companyId } },
        invitedBy: { connect: { id: currentUserId } },
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        role: userRole,
      },
    });

    // Un email est envoyé avec un lien /invitations/accept?token=xxx
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const invitationLink = `${frontendUrl}/invitations/accept?token=${generatedToken}`;
    await this.mailService.sendCompanyInviteEmail({
      to: userEmail,
      companyName: company.name,
      invitationLink,
    });

    // La personne clique, le token est validé (expiration, déjà utilisé, tenant correct)
    // Si elle n'a pas de compte → redirect vers inscription pré-remplie avec l'email
    // Si elle a déjà un compte → elle est directement rattachée au tenant avec le rôle défini à l'invitation
    // Le token passe en ACCEPTED et ne peut plus être réutilisé
    return `User ${userEmail} invited to company ${companyId}`;
  }

  async changeMemberRole(
    companyId: string,
    userId: string,
    newRole: CompanyRole,
  ): Promise<string> {
    const membership = await this.prismaService.companyUser.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    await this.prismaService.companyUser.update({
      where: { userId_companyId: { userId, companyId } },
      data: { role: newRole },
    });

    return `User ${userId} role changed to ${newRole} in company ${companyId}`;
  }

  async removeMember(companyId: string, userId: string): Promise<string> {
    const membership = await this.prismaService.companyUser.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    await this.prismaService.companyUser.delete({
      where: { userId_companyId: { userId, companyId } },
    });

    return `User ${userId} removed from company ${companyId}`;
  }

  async listMembers(companyId: string): Promise<ICompanyMember[]> {
    const members = await this.prismaService.companyUser.findMany({
      where: { companyId },
      include: { user: true },
    });

    return members.map((member) => ({
      userId: member.user.id,
      email: member.user.email,
      role: member.role,
    }));
  }
}

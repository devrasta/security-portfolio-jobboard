import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from '../security/token.service';
import { CompanyRole } from '../prisma/generated/enums';

@Injectable()
export class MembersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tokenService: TokenService,
  ) {}
  async inviteMember(
    companyId: string,
    userEmail: string,
    currentUserId: string,
    userRole: CompanyRole,
  ): Promise<string> {
    // Logic to invite a member to the company
    const generatedToken = this.tokenService.generateUUID();
    // Un token d'invitation est généré (UUID v4, signé, TTL 48h) et stocké en DB avec le statut PENDING
    this.prismaService.companyInvite.create({
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
    // La personne clique, le token est validé (expiration, déjà utilisé, tenant correct)
    // Si elle n'a pas de compte → redirect vers inscription pré-remplie avec l'email
    // Si elle a déjà un compte → elle est directement rattachée au tenant avec le rôle défini à l'invitation
    // Le token passe en ACCEPTED et ne peut plus être réutilisé
    return `User ${userEmail} invited to company ${companyId}`;
  }
}

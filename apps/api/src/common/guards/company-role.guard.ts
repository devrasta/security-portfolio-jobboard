import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { CompanyRole } from '../../modules/prisma/generated/enums';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../modules/prisma/prisma.service';

@Injectable()
export class CompanyRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.get<CompanyRole>(
      'requiredRole',
      context.getHandler(),
    );
    if (!requiredRole) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user.userId;
    const companyId = request.params.companyId;

    if (!companyId) throw new BadRequestException('companyId manquant');

    const membership = await this.prisma.companyUser.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });

    if (!membership) throw new ForbiddenException();

    // Hiérarchie des rôles
    const roleHierarchy = {
      [CompanyRole.MEMBER]: 0,
      [CompanyRole.ADMIN]: 1,
      [CompanyRole.OWNER]: 2,
    };

    return roleHierarchy[membership.role] >= roleHierarchy[requiredRole];
  }
}

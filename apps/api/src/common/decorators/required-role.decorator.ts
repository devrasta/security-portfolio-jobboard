import { SetMetadata } from '@nestjs/common';
import { CompanyRole } from '../../modules/prisma/generated/enums';

export const RequiredRole = (role: CompanyRole) =>
  SetMetadata('requiredRole', role);

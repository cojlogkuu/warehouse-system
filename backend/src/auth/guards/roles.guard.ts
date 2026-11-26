import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../../common/decorators/roles.decorator'
import type { AuthenticatedRequest } from '../../common/types'
import type { Role } from '../../generated/prisma/enums'

/**
 * Global guard that checks the role of the user on routes restricted with `@Roles`. It runs
 * after `JwtAuthGuard`, which attaches the user to the request.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  /**
   * Creates the guard.
   *
   * @param reflector - Reads the metadata of routes.
   */
  constructor(private readonly reflector: Reflector) {}

  /**
   * Checks the role of the user against the roles of the route.
   *
   * @param context - Context of the current request.
   * @returns `false` (answered with 403) if the route is restricted to other roles.
   */
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!roles) {
      return true
    }
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>()
    return user !== undefined && roles.includes(user.role)
  }
}

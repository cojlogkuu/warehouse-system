import { type CustomDecorator, SetMetadata } from '@nestjs/common'
import type { Role } from '../../generated/prisma/enums'

/** Metadata key of the roles allowed on a route. */
export const ROLES_KEY = 'roles'

/**
 * Restricts a route or a whole controller to the listed roles. A decorator on a method replaces
 * the one on its controller. Without it every authenticated user is accepted.
 *
 * @param roles - Allowed roles, at least one.
 * @returns The class or method decorator.
 */
export function Roles(...roles: [Role, ...Role[]]): CustomDecorator {
  return SetMetadata(ROLES_KEY, roles)
}

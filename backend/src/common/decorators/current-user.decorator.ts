import { type ExecutionContext, UnauthorizedException, createParamDecorator } from '@nestjs/common'
import type { AuthenticatedRequest, AuthenticatedUser } from '../types'

/**
 * Reads the authenticated user of the current request.
 *
 * @param _decoratorArgument - Unused argument of the decorator.
 * @param context - Context of the current request.
 * @returns The authenticated user.
 * @throws UnauthorizedException if the route is public and therefore has no user.
 */
function readCurrentUser(
  _decoratorArgument: unknown,
  context: ExecutionContext,
): AuthenticatedUser {
  const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>()
  if (!user) {
    throw new UnauthorizedException()
  }
  return user
}

/** Injects the authenticated user into a controller parameter. */
export const CurrentUser = createParamDecorator(readCurrentUser)

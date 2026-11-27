import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator'

/**
 * Global guard that requires a valid access token on every route not marked as public.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Creates the guard.
   *
   * @param reflector - Reads the metadata of routes.
   */
  constructor(private readonly reflector: Reflector) {
    super()
  }

  /**
   * Lets public routes through and authenticates every other request.
   *
   * @param context - Context of the current request.
   * @returns Whether the request may continue.
   * @throws UnauthorizedException if the token is missing or not accepted.
   */
  override canActivate(context: ExecutionContext): ReturnType<CanActivate['canActivate']> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    return isPublic ? true : super.canActivate(context)
  }
}

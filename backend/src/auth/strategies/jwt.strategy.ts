import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import type { AuthenticatedUser } from '../../common/types'
import type { EnvironmentVariables } from '../../config/environment'
import { JWT_ALGORITHM } from '../auth.constants'
import { AuthService } from '../auth.service'
import type { JwtPayload } from '../auth.types'

/**
 * Passport strategy of the access token: reads it from the `Authorization: Bearer` header,
 * checks signature and expiry and resolves the user.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * Configures how access tokens are read and verified.
   *
   * @param config - Secret of the access tokens.
   * @param auth - Resolves the user of a token.
   */
  constructor(
    config: ConfigService<EnvironmentVariables, true>,
    private readonly auth: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_ACCESS_SECRET', { infer: true }),
      algorithms: [JWT_ALGORITHM],
    })
  }

  /**
   * Called by Passport for a token with a valid signature that has not expired.
   *
   * @param payload - Claims of the token.
   * @returns The user that Passport attaches to the request.
   * @throws UnauthorizedException if the user may no longer use the system.
   */
  validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    return this.auth.validatePayload(payload)
  }
}

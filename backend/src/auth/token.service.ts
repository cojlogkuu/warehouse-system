import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { createHash, randomUUID } from 'node:crypto'
import type { EnvironmentVariables } from '../config/environment'
import { INVALID_REFRESH_TOKEN, JWT_ALGORITHM } from './auth.constants'
import { AuthTokensDto } from './auth.dto'
import type { JwtPayload } from './auth.types'

/** A freshly signed pair of tokens and what has to be stored about it. */
export interface IssuedSession {
  /** The tokens for the client. */
  tokens: AuthTokensDto
  /** Hash of the refresh token. */
  refreshTokenHash: string
  /** Expiry of the refresh token. */
  refreshExpiresAt: Date
}

/**
 * Signs, verifies and hashes tokens. Access and refresh tokens use different secrets, so one
 * kind is never accepted as the other.
 */
@Injectable()
export class TokenService {
  /**
   * Creates the service.
   *
   * @param jwt - JSON Web Token signing and verification.
   * @param config - Secrets and lifetimes.
   */
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  /**
   * Signs a new access token and refresh token.
   *
   * @param userId - Identifier of the user.
   * @returns The tokens with the hash and expiry of the refresh token.
   */
  async issueTokens(userId: string): Promise<IssuedSession> {
    const issuedAt = Math.floor(Date.now() / 1000)
    const accessTtl = this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true })
    const refreshTtl = this.config.get('JWT_REFRESH_TTL_SECONDS', { infer: true })
    const accessToken = await this.jwt.signAsync(
      { sub: userId, iat: issuedAt },
      {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        algorithm: JWT_ALGORITHM,
        expiresIn: accessTtl,
      },
    )
    // The random identifier keeps two tokens signed in the same second different
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, jti: randomUUID(), iat: issuedAt },
      {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
        algorithm: JWT_ALGORITHM,
        expiresIn: refreshTtl,
      },
    )
    return {
      tokens: Object.assign(new AuthTokensDto(), {
        accessToken,
        expiresIn: accessTtl,
        refreshToken,
      }),
      refreshTokenHash: this.hashToken(refreshToken),
      refreshExpiresAt: new Date((issuedAt + refreshTtl) * 1000),
    }
  }

  /**
   * Checks signature and expiry of a refresh token.
   *
   * @param token - Presented token.
   * @returns Its claims.
   * @throws UnauthorizedException if the token is expired, altered or not a refresh token.
   */
  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
        algorithms: [JWT_ALGORITHM],
      })
    } catch {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN)
    }
  }

  /**
   * Hashes a token for storage and lookup. A fast hash is enough because the token is long,
   * random and signed; bcrypt would only read its first 72 bytes.
   *
   * @param token - Token to hash.
   * @returns The SHA-256 hash in hexadecimal form.
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}

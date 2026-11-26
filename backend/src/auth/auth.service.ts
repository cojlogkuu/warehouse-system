import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import type { AuthenticatedUser } from '../common/types'
import type { Prisma } from '../generated/prisma/client'
import { PasswordHasher } from '../modules/users/password-hasher'
import { RefreshTokensRepository } from '../modules/users/refresh-tokens.repository'
import { ResetPasswordDto } from '../modules/users/users.dto'
import { UsersService } from '../modules/users/users.service'
import { PrismaService } from '../prisma/prisma.service'
import { INVALID_REFRESH_TOKEN } from './auth.constants'
import type { AuthTokensDto, ChangePasswordDto, LoginDto } from './auth.dto'
import type { JwtPayload } from './auth.types'
import { TokenService } from './token.service'

/** One message for every failed login, so it does not reveal which accounts exist. */
const INVALID_CREDENTIALS = 'Invalid e-mail or password'

/** Result of a refresh attempt, returned out of the transaction so that it commits first. */
type RefreshOutcome =
  { kind: 'rotated'; tokens: AuthTokensDto } | { kind: 'reused' } | { kind: 'invalid' }

/**
 * Login, refresh sessions, logout and the check of access tokens.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  /**
   * Creates the service.
   *
   * @param prisma - Database client, used to open transactions.
   * @param users - User accounts.
   * @param refreshTokens - Data access for refresh sessions.
   * @param passwords - Password comparison.
   * @param tokens - Token signing, verification and hashing.
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly refreshTokens: RefreshTokensRepository,
    private readonly passwords: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  /**
   * Opens a new session for an active user.
   *
   * @param dto - E-mail address and password.
   * @returns The tokens of the session.
   * @throws UnauthorizedException if the address is unknown, the password is wrong or the
   *   account is deactivated.
   */
  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const user = await this.users.findByEmail(dto.email)
    const passwordMatches = await this.passwords.verify(dto.password, user?.passwordHash)
    if (!user || !passwordMatches || !user.isActive) {
      throw new UnauthorizedException(INVALID_CREDENTIALS)
    }
    return this.prisma.$transaction(async (transaction) => {
      // The account may have been deactivated or its password reset during the comparison
      const current = await this.users.lockById(user.id, transaction)
      if (!current?.isActive || current.passwordHash !== user.passwordHash) {
        throw new UnauthorizedException(INVALID_CREDENTIALS)
      }
      await this.refreshTokens.deleteExpired(user.id, new Date(), transaction)
      return this.openSession(user.id, transaction)
    })
  }

  /**
   * Exchanges a refresh token for new tokens and revokes it (rotation). A token that was
   * already revoked is treated as stolen: all sessions of its user end.
   *
   * @param refreshToken - Presented refresh token.
   * @returns The new tokens.
   * @throws UnauthorizedException if the token is invalid, expired, revoked or unknown, or its
   *   user is deactivated.
   */
  async refresh(refreshToken: string): Promise<AuthTokensDto> {
    const { sub: userId } = await this.tokens.verifyRefreshToken(refreshToken)
    const tokenHash = this.tokens.hash(refreshToken)
    const outcome = await this.prisma.$transaction(async (transaction): Promise<RefreshOutcome> => {
      // The lock makes parallel requests with the same token run one after the other
      const user = await this.users.lockById(userId, transaction)
      const session = await this.refreshTokens.findByHash(tokenHash, transaction)
      if (!user || session?.userId !== user.id) {
        return { kind: 'invalid' }
      }
      const now = new Date()
      const isUsable = !session.revokedAt && user.isActive && session.expiresAt > now
      if (isUsable && (await this.refreshTokens.revoke(session.id, now, transaction))) {
        return { kind: 'rotated', tokens: await this.openSession(user.id, transaction) }
      }
      if (session.revokedAt || isUsable) {
        await this.refreshTokens.revokeAllForUser(user.id, now, transaction)
        return { kind: 'reused' }
      }
      return { kind: 'invalid' }
    })
    if (outcome.kind === 'rotated') {
      return outcome.tokens
    }
    if (outcome.kind === 'reused') {
      this.logger.warn(`Revoked refresh token presented; all sessions of user ${userId} ended`)
    }
    throw new UnauthorizedException(INVALID_REFRESH_TOKEN)
  }

  /**
   * Ends the session of a refresh token. Doing nothing is not an error.
   *
   * @param userId - The authenticated user; only their own session can be ended.
   * @param refreshToken - Refresh token of the session, empty if the client has none.
   * @returns A promise that resolves once done.
   */
  async logout(userId: string, refreshToken: string): Promise<void> {
    if (refreshToken) {
      await this.refreshTokens.revokeOwn(userId, this.tokens.hash(refreshToken), new Date())
    }
  }

  /**
   * Lets a user replace their own password. All their sessions end, the current one included.
   *
   * @param userId - The authenticated user.
   * @param dto - Current and new password.
   * @returns A promise that resolves once the password is set.
   * @throws BadRequestException if the current password is wrong.
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.users.findById(userId)
    if (!(await this.passwords.verify(dto.currentPassword, user?.passwordHash))) {
      // Not 401: the access token is fine, so the client must not try to refresh it
      throw new BadRequestException('The current password is incorrect')
    }
    const reset = Object.assign(new ResetPasswordDto(), { password: dto.newPassword })
    await this.users.resetPassword(userId, reset)
  }

  /**
   * Turns the claims of a verified access token into the current user, so deactivation and role
   * changes take effect on the next request.
   *
   * @param payload - Claims of the token.
   * @returns The user as stored now.
   * @throws UnauthorizedException if the user no longer exists or is deactivated.
   */
  async validatePayload(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.users.findById(payload.sub)
    if (!user?.isActive) {
      throw new UnauthorizedException()
    }
    return { id: user.id, email: user.email, fullName: user.fullName, role: user.role }
  }

  /**
   * Signs tokens and stores the session of the refresh token.
   *
   * @param userId - Owner of the session.
   * @param transaction - Client of the surrounding transaction.
   * @returns The tokens.
   */
  private async openSession(
    userId: string,
    transaction: Prisma.TransactionClient,
  ): Promise<AuthTokensDto> {
    const session = await this.tokens.issue(userId)
    await this.refreshTokens.create(
      { userId, tokenHash: session.refreshTokenHash, expiresAt: session.refreshExpiresAt },
      transaction,
    )
    return session.tokens
  }
}

import { Injectable } from '@nestjs/common'
import type { Prisma, RefreshToken } from '../../generated/prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

/** Values of a refresh token to be stored. */
export interface NewRefreshToken {
  /** Owner of the session. */
  userId: string
  /** Hash of the token; the token itself is never stored. */
  tokenHash: string
  /** Moment at which the token stops being valid. */
  expiresAt: Date
}

/**
 * Data access for the `RefreshToken` entity: the refresh sessions of the users.
 */
@Injectable()
export class RefreshTokensRepository {
  /**
   * Creates the repository.
   *
   * @param prisma - Database client.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Stores a new session.
   *
   * @param data - Values of the new session.
   * @param transaction - Client of the surrounding transaction.
   * @returns The stored session.
   */
  create(data: NewRefreshToken, transaction: Prisma.TransactionClient): Promise<RefreshToken> {
    return transaction.refreshToken.create({ data })
  }

  /**
   * Finds a session by its token.
   *
   * @param tokenHash - Hash of a presented token.
   * @param transaction - Client of the surrounding transaction.
   * @returns The session of that token, revoked or not, or `null` if it is unknown.
   */
  findByHash(
    tokenHash: string,
    transaction: Prisma.TransactionClient,
  ): Promise<RefreshToken | null> {
    return transaction.refreshToken.findUnique({ where: { tokenHash } })
  }

  /**
   * Revokes a session that is still open.
   *
   * @param id - Identifier of the session.
   * @param revokedAt - Time of the revocation.
   * @param transaction - Client of the surrounding transaction.
   * @returns `false` if the session had already been revoked.
   */
  async revoke(
    id: string,
    revokedAt: Date,
    transaction: Prisma.TransactionClient,
  ): Promise<boolean> {
    const { count } = await transaction.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt },
    })
    return count === 1
  }

  /**
   * Revokes the open session of a token, but only if it belongs to the given user.
   *
   * @param userId - Owner of the session.
   * @param tokenHash - Hash of the token.
   * @param revokedAt - Time of the revocation.
   * @returns A promise that resolves once done, also when nothing matched.
   */
  async revokeOwn(userId: string, tokenHash: string, revokedAt: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash, revokedAt: null },
      data: { revokedAt },
    })
  }

  /**
   * Ends every open session of a user.
   *
   * @param userId - Owner of the sessions.
   * @param revokedAt - Time of the revocation.
   * @param transaction - Client of the surrounding transaction.
   * @returns A promise that resolves once done.
   */
  async revokeAllForUser(
    userId: string,
    revokedAt: Date,
    transaction: Prisma.TransactionClient,
  ): Promise<void> {
    await transaction.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    })
  }

  /**
   * Removes the expired sessions of a user; their tokens are rejected by the expiry check anyway.
   *
   * @param userId - Owner of the sessions.
   * @param now - Sessions that expired up to this moment are removed.
   * @param transaction - Client of the surrounding transaction.
   * @returns A promise that resolves once done.
   */
  async deleteExpired(
    userId: string,
    now: Date,
    transaction: Prisma.TransactionClient,
  ): Promise<void> {
    await transaction.refreshToken.deleteMany({ where: { userId, expiresAt: { lte: now } } })
  }
}

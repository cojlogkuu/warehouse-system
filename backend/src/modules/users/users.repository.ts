import { Injectable } from '@nestjs/common'
import type { Prisma, User } from '../../generated/prisma/client'
import { Role } from '../../generated/prisma/enums'
import { PrismaService } from '../../prisma/prisma.service'
import { escapeLikePattern } from '../../prisma/prisma.utils'

/** Optional conditions of the user list. */
export interface UserFilter {
  /** Part of the e-mail address or of the full name, case-insensitive. */
  search?: string
  /** Role of the users. */
  role?: Role
  /** Whether the users are active. */
  isActive?: boolean
}

/**
 * Data access for the `User` entity.
 */
@Injectable()
export class UsersRepository {
  /**
   * Creates the repository.
   *
   * @param prisma - Database client.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists users ordered by full name.
   *
   * @param filter - Conditions the users must meet.
   * @returns The matching users.
   */
  findMany({ search, role, isActive }: UserFilter): Promise<User[]> {
    const where: Prisma.UserWhereInput = { role, isActive }
    if (search) {
      const contains = escapeLikePattern(search)
      where.OR = [
        { email: { contains, mode: 'insensitive' } },
        { fullName: { contains, mode: 'insensitive' } },
      ]
    }
    return this.prisma.user.findMany({ where, orderBy: [{ fullName: 'asc' }, { id: 'asc' }] })
  }

  /**
   * Finds a user by identifier.
   *
   * @param id - Identifier of the user.
   * @returns The user, or `null` if there is none.
   */
  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } })
  }

  /**
   * Finds a user by e-mail address.
   *
   * @param email - Normalized e-mail address.
   * @returns The user with that address, or `null` if there is none.
   */
  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } })
  }

  /**
   * Locks the row of a user until the transaction ends and reads it.
   *
   * @param id - Identifier of the user.
   * @param transaction - Client of the surrounding transaction.
   * @returns The current state of the user, or `null` if there is none.
   */
  async lockById(id: string, transaction: Prisma.TransactionClient): Promise<User | null> {
    await transaction.$queryRaw`SELECT id FROM users WHERE id = ${id}::uuid FOR UPDATE`
    return transaction.user.findUnique({ where: { id } })
  }

  /**
   * Locks the rows of all active administrators, always in the order of their identifiers so
   * that concurrent transactions cannot deadlock.
   *
   * @param transaction - Client of the surrounding transaction.
   * @returns The identifiers of the active administrators.
   */
  async lockActiveAdmins(transaction: Prisma.TransactionClient): Promise<string[]> {
    const rows = await transaction.$queryRaw<{ id: string }[]>`
      SELECT id FROM users WHERE role = ${Role.ADMIN}::role AND is_active ORDER BY id FOR UPDATE`
    return rows.map((row) => row.id)
  }

  /**
   * Inserts a user.
   *
   * @param data - Values of the new user.
   * @returns The created user.
   */
  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data })
  }

  /**
   * Updates a user.
   *
   * @param id - Identifier of an existing user.
   * @param data - Values to change.
   * @param transaction - Client of the surrounding transaction.
   * @returns The changed user.
   */
  update(
    id: string,
    data: Prisma.UserUpdateInput,
    transaction: Prisma.TransactionClient,
  ): Promise<User> {
    return transaction.user.update({ where: { id }, data })
  }
}

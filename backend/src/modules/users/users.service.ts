import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma, User } from '../../generated/prisma/client'
import { Role } from '../../generated/prisma/enums'
import { PrismaService } from '../../prisma/prisma.service'
import { violatesUniqueConstraint } from '../../prisma/prisma.utils'
import { PasswordHasher } from './password-hasher'
import { RefreshTokensRepository } from './refresh-tokens.repository'
import {
  type CreateUserDto,
  type ResetPasswordDto,
  type UpdateUserDto,
  UserDto,
  type UserQueryDto,
} from './users.dto'
import { UsersRepository } from './users.repository'

/**
 * Application logic of user accounts. Users are never deleted, only deactivated.
 */
@Injectable()
export class UsersService {
  /**
   * Creates the service.
   *
   * @param prisma - Database client, used to open transactions.
   * @param users - Data access for users.
   * @param refreshTokens - Data access for the sessions of the users.
   * @param passwords - Password hashing.
   */
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersRepository,
    private readonly refreshTokens: RefreshTokensRepository,
    private readonly passwords: PasswordHasher,
  ) {}

  /**
   * Lists users.
   *
   * @param userQuery - Conditions the users must meet.
   * @returns The matching users ordered by full name.
   */
  async listUsers(userQuery: UserQueryDto): Promise<UserDto[]> {
    const users = await this.users.findMany(userQuery)
    return users.map((user) => UserDto.fromRecord(user))
  }

  /**
   * Returns one user.
   *
   * @param id - Identifier of the user.
   * @returns The public data of the user.
   * @throws NotFoundException if there is no such user.
   */
  async findPublicUser(id: string): Promise<UserDto> {
    return UserDto.fromRecord(this.assertUserFound(await this.users.findById(id)))
  }

  /**
   * Looks a user up for other services; the result contains the password hash.
   *
   * @param id - Identifier of the user.
   * @returns The user, or `null` if there is none.
   */
  findUserById(id: string): Promise<User | null> {
    return this.users.findById(id)
  }

  /**
   * Looks a user up for other services; the result contains the password hash.
   *
   * @param email - Normalized e-mail address.
   * @returns The user, or `null` if there is none.
   */
  findUserByEmail(email: string): Promise<User | null> {
    return this.users.findByEmail(email)
  }

  /**
   * Locks a user until the transaction ends. Whoever opens or revokes sessions takes this lock,
   * so a session cannot be created while the account is being changed.
   *
   * @param id - Identifier of the user.
   * @param transaction - Client of the surrounding transaction.
   * @returns The current state of the user, or `null` if there is none.
   */
  lockUserById(id: string, transaction: Prisma.TransactionClient): Promise<User | null> {
    return this.users.lockById(id, transaction)
  }

  /**
   * Creates an active user.
   *
   * @param newUser - Data of the new user.
   * @returns The created user.
   * @throws ConflictException if the e-mail address is already taken.
   */
  async createUser(newUser: CreateUserDto): Promise<UserDto> {
    const passwordHash = await this.passwords.hashPassword(newUser.password)
    try {
      const user = await this.users.create({
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        passwordHash,
      })
      return UserDto.fromRecord(user)
    } catch (error) {
      throw this.translateWriteError(error)
    }
  }

  /**
   * Changes a user. A new role or a deactivation ends all sessions of the user.
   *
   * @param id - Identifier of the user.
   * @param userChanges - Values to change.
   * @returns The changed user.
   * @throws NotFoundException if there is no such user.
   * @throws ConflictException if the e-mail address is already taken, or the change would leave
   *   the system without an active administrator.
   */
  async updateUser(id: string, userChanges: UpdateUserDto): Promise<UserDto> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        // Administrators are locked first: two of them cannot remove each other concurrently
        const administrators = await this.users.lockActiveAdmins(transaction)
        const user = this.assertUserFound(await this.users.lockById(id, transaction))
        const role = userChanges.role ?? user.role
        const isActive = userChanges.isActive ?? user.isActive
        const stopsAdministering =
          user.role === Role.ADMIN && user.isActive && (role !== Role.ADMIN || !isActive)
        if (stopsAdministering && administrators.every((administrator) => administrator === id)) {
          throw new ConflictException(
            'The last active administrator cannot be deactivated or given another role',
          )
        }
        const updatedUser = await this.users.update(
          id,
          {
            email: userChanges.email,
            fullName: userChanges.fullName,
            role: userChanges.role,
            isActive: userChanges.isActive,
          },
          transaction,
        )
        if (role !== user.role || (user.isActive && !isActive)) {
          await this.refreshTokens.revokeAllForUser(id, new Date(), transaction)
        }
        return UserDto.fromRecord(updatedUser)
      })
    } catch (error) {
      throw this.translateWriteError(error)
    }
  }

  /**
   * Sets a new password and ends all sessions of the user.
   *
   * @param id - Identifier of the user.
   * @param newPassword - The new password.
   * @returns A promise that resolves once the password is stored.
   * @throws NotFoundException if there is no such user.
   */
  async resetPassword(id: string, newPassword: ResetPasswordDto): Promise<void> {
    const passwordHash = await this.passwords.hashPassword(newPassword.password)
    await this.prisma.$transaction(async (transaction) => {
      this.assertUserFound(await this.users.lockById(id, transaction))
      await this.users.update(id, { passwordHash }, transaction)
      await this.refreshTokens.revokeAllForUser(id, new Date(), transaction)
    })
  }

  /**
   * Turns an empty lookup into an error.
   *
   * @param user - Result of a lookup.
   * @returns The user.
   * @throws NotFoundException if the lookup found nothing.
   */
  private assertUserFound(user: User | null): User {
    if (!user) {
      throw new NotFoundException('User not found')
    }
    return user
  }

  /**
   * Explains a rejected write.
   *
   * @param error - Error of a write to the users table.
   * @returns A conflict for a duplicate e-mail address, otherwise the error itself.
   */
  private translateWriteError(error: unknown): unknown {
    return violatesUniqueConstraint(error)
      ? new ConflictException('A user with this e-mail address already exists')
      : error
  }
}

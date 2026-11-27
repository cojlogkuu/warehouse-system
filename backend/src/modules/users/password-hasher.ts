import { Injectable, type OnModuleInit } from '@nestjs/common'
import { compare, hash } from 'bcrypt'
import { randomBytes } from 'node:crypto'
import { BCRYPT_COST } from '../../common/constants'

/**
 * Hashes passwords and compares them with stored hashes.
 */
@Injectable()
export class PasswordHasher implements OnModuleInit {
  /** Hash of a random value, compared against when there is no stored hash. */
  private decoyHash: string

  /**
   * Prepares the decoy hash before the first request arrives.
   *
   * @returns A promise that resolves once the hash exists.
   */
  async onModuleInit(): Promise<void> {
    this.decoyHash = await this.hash(randomBytes(32).toString('base64'))
  }

  /**
   * Hashes a password.
   *
   * @param password - Plain password.
   * @returns The bcrypt hash.
   */
  hash(password: string): Promise<string> {
    return hash(password, BCRYPT_COST)
  }

  /**
   * Compares a password with a stored hash. Without a hash (unknown account) the same work is
   * done, so the response time does not reveal whether the account exists.
   *
   * @param password - Plain password.
   * @param passwordHash - Stored hash, if there is an account.
   * @returns `true` only if there is a hash and the password matches it.
   */
  async verify(password: string, passwordHash: string | undefined): Promise<boolean> {
    const matches = await compare(password, passwordHash ?? this.decoyHash)
    return passwordHash !== undefined && matches
  }
}

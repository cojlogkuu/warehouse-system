import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaPg } from '@prisma/adapter-pg'
import type { EnvironmentVariables } from '../config/environment'
import { PrismaClient } from '../generated/prisma/client'

/**
 * Database client of the application; owns the lifecycle of the connection pool.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /**
   * Creates the client for the configured database.
   *
   * @param config - Typed access to the validated environment variables.
   */
  constructor(config: ConfigService<EnvironmentVariables, true>) {
    const connectionString = config.get('DATABASE_URL', { infer: true })
    // Minimal errors never quote query arguments, so password and token hashes stay out of logs
    super({ adapter: new PrismaPg({ connectionString }), errorFormat: 'minimal' })
  }

  /**
   * Connects when the application starts. The pool connects lazily, so a trivial query is sent
   * to make an unreachable database fail the startup.
   *
   * @returns A promise that resolves once the database has answered.
   * @throws Error if the database cannot be reached or rejects the credentials.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect()
      await this.$queryRaw`SELECT 1`
    } catch (error) {
      throw new Error(
        'Cannot connect to the database: check DATABASE_URL and that PostgreSQL is running',
        { cause: error },
      )
    }
  }

  /**
   * Closes the connection pool when the application shuts down.
   *
   * @returns A promise that resolves once all connections are closed.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }
}

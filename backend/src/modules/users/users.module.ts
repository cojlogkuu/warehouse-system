import { Module } from '@nestjs/common'
import { PasswordHasher } from './password-hasher'
import { RefreshTokensRepository } from './refresh-tokens.repository'
import { UsersController } from './users.controller'
import { UsersRepository } from './users.repository'
import { UsersService } from './users.service'

/**
 * User accounts and their sessions.
 */
@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, RefreshTokensRepository, PasswordHasher],
  exports: [UsersService, RefreshTokensRepository, PasswordHasher],
})
export class UsersModule {}

import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { ThrottlerModule } from '@nestjs/throttler'
import { UsersModule } from '../modules/users/users.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { RolesGuard } from './guards/roles.guard'
import { PASSWORD_ATTEMPT_LIMITS } from './login-throttling'
import { RefreshCookie } from './refresh-cookie'
import { JwtStrategy } from './strategies/jwt.strategy'
import { TokenService } from './token.service'

/**
 * Authentication, and the guards that protect every route of the application.
 */
@Module({
  imports: [UsersModule, JwtModule.register({}), ThrottlerModule.forRoot(PASSWORD_ATTEMPT_LIMITS)],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    RefreshCookie,
    JwtStrategy,
    // Global guards run in this order: first who is asking, then whether they may
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}

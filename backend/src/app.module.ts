import { Module, ValidationPipe } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_PIPE } from '@nestjs/core'
import { AuthModule } from './auth/auth.module'
import { MalformedBodyFilter } from './common/filters/malformed-body.filter'
import { validateEnvironment } from './config/environment'
import { UsersModule } from './modules/users/users.module'
import { PrismaModule } from './prisma/prisma.module'

/**
 * Root module of the application.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnvironment }),
    PrismaModule,
    UsersModule,
    AuthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: MalformedBodyFilter },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}

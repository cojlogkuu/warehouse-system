import { Module, ValidationPipe } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_PIPE } from '@nestjs/core'
import { AuthModule } from './auth/auth.module'
import { MalformedBodyFilter } from './common/filters/malformed-body.filter'
import { validateEnvironment } from './config/environment'
import { CategoriesModule } from './modules/categories/categories.module'
import { CounterpartiesModule } from './modules/counterparties/counterparties.module'
import { ProductsModule } from './modules/products/products.module'
import { SettingsModule } from './modules/settings/settings.module'
import { UnitsModule } from './modules/units/units.module'
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
    CategoriesModule,
    UnitsModule,
    CounterpartiesModule,
    ProductsModule,
    SettingsModule,
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

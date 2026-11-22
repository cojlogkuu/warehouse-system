import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

/**
 * Root module of the application.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
})
export class AppModule {}

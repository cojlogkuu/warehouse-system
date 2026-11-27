import { Module } from '@nestjs/common'
import { SettingsController } from './settings.controller'
import { SettingsRepository } from './settings.repository'
import { SettingsService } from './settings.service'

/**
 * System settings.
 */
@Module({
  controllers: [SettingsController],
  providers: [SettingsService, SettingsRepository],
  exports: [SettingsService],
})
export class SettingsModule {}

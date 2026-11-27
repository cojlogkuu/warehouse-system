import { Body, Controller, Get, Patch } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Roles } from '../../common/decorators/roles.decorator'
import { Role } from '../../generated/prisma/enums'
import { SettingsDto, UpdateSettingsDto } from './settings.dto'
import { SettingsService } from './settings.service'

/**
 * REST routes of the system settings, for administrators only.
 */
@ApiTags('settings')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('settings')
export class SettingsController {
  /**
   * Creates the controller.
   *
   * @param settings - Application logic of the settings.
   */
  constructor(private readonly settings: SettingsService) {}

  /**
   * Shows the settings.
   *
   * @returns The settings.
   */
  @Get()
  @ApiOkResponse({ type: SettingsDto })
  showSettings(): Promise<SettingsDto> {
    return this.settings.getSettings()
  }

  /**
   * Changes the settings.
   *
   * @param settingsChanges - Values to change.
   * @returns The changed settings.
   */
  @Patch()
  @ApiOkResponse({ type: SettingsDto })
  updateSettings(@Body() settingsChanges: UpdateSettingsDto): Promise<SettingsDto> {
    return this.settings.updateSettings(settingsChanges)
  }
}

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import type { CompanyDetails } from '../../common/types'
import type { SystemSettings } from '../../generated/prisma/client'
import type { ValuationMethod } from '../../generated/prisma/enums'
import { isMissingRecord } from '../../prisma/prisma.utils'
import { SettingsDto, type UpdateSettingsDto } from './settings.dto'
import { SettingsRepository } from './settings.repository'

const MISSING_SETTINGS = 'System settings are missing: run the seed'

/**
 * Application logic of the system settings.
 */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name)

  /**
   * Creates the service.
   *
   * @param settings - Data access for the settings.
   */
  constructor(private readonly settings: SettingsRepository) {}

  /**
   * Returns the settings.
   *
   * @returns The settings.
   * @throws InternalServerErrorException if the database has not been seeded.
   */
  async getSettings(): Promise<SettingsDto> {
    return SettingsDto.fromRecord(await this.loadSettingsRow())
  }

  /**
   * Changes the settings.
   *
   * @param settingsChanges - Values to change.
   * @returns The changed settings.
   * @throws InternalServerErrorException if the database has not been seeded.
   */
  async updateSettings(settingsChanges: UpdateSettingsDto): Promise<SettingsDto> {
    try {
      const settings = await this.settings.update({
        companyName: settingsChanges.companyName,
        companyAddress: settingsChanges.companyAddress,
        defaultValuationMethod: settingsChanges.defaultValuationMethod,
        lowStockAlertsEnabled: settingsChanges.lowStockAlertsEnabled,
      })
      return SettingsDto.fromRecord(settings)
    } catch (error) {
      throw isMissingRecord(error) ? this.reportMissingSettings() : error
    }
  }

  /**
   * Returns the data of the company for printed documents.
   *
   * @returns Name and address of the company.
   * @throws InternalServerErrorException if the database has not been seeded.
   */
  async getCompanyDetails(): Promise<CompanyDetails> {
    const { companyName, companyAddress } = await this.loadSettingsRow()
    return { name: companyName, address: companyAddress }
  }

  /**
   * Returns the valuation method to use when none is requested.
   *
   * @returns The default method.
   * @throws InternalServerErrorException if the database has not been seeded.
   */
  async getDefaultValuation(): Promise<ValuationMethod> {
    return (await this.loadSettingsRow()).defaultValuationMethod
  }

  /**
   * Tells whether low-stock alerts are to be created.
   *
   * @returns `true` if alerts are enabled.
   * @throws InternalServerErrorException if the database has not been seeded.
   */
  async areAlertsEnabled(): Promise<boolean> {
    return (await this.loadSettingsRow()).lowStockAlertsEnabled
  }

  /**
   * Reads the settings row, which must exist.
   *
   * @returns The stored settings.
   * @throws InternalServerErrorException if the row is missing.
   */
  private async loadSettingsRow(): Promise<SystemSettings> {
    const settings = await this.settings.find()
    if (!settings) {
      throw this.reportMissingSettings()
    }
    return settings
  }

  /**
   * Logs that the settings row is missing and builds the error to answer with.
   *
   * @returns The error.
   */
  private reportMissingSettings(): InternalServerErrorException {
    this.logger.error(MISSING_SETTINGS)
    return new InternalServerErrorException(MISSING_SETTINGS)
  }
}

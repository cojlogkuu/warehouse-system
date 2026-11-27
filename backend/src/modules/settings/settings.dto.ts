import { ApiProperty, PartialType } from '@nestjs/swagger'
import { IsBoolean, IsEnum } from 'class-validator'
import { IsRequiredText } from '../../common/validators'
import type { SystemSettings } from '../../generated/prisma/client'
import { ValuationMethod } from '../../generated/prisma/enums'

const MAX_NAME_LENGTH = 200
const MAX_ADDRESS_LENGTH = 500

/**
 * The settings that can be changed.
 */
class SettingsValuesDto {
  /** Name of the company, printed on documents. */
  @IsRequiredText(MAX_NAME_LENGTH)
  companyName: string

  /** Address of the company, printed on documents. */
  @IsRequiredText(MAX_ADDRESS_LENGTH)
  companyAddress: string

  /** Valuation method used when a report does not name one. */
  @ApiProperty({ enum: ValuationMethod, enumName: 'ValuationMethod' })
  @IsEnum(ValuationMethod)
  defaultValuationMethod: ValuationMethod

  /** Whether low-stock alerts are created. */
  @ApiProperty()
  @IsBoolean()
  lowStockAlertsEnabled: boolean
}

/**
 * Settings to change; omitted values stay, `null` is rejected.
 */
export class UpdateSettingsDto extends PartialType(SettingsValuesDto, {
  skipNullProperties: false,
}) {}

/**
 * The system settings.
 */
export class SettingsDto extends SettingsValuesDto {
  /** Time of the last change. */
  @ApiProperty()
  updatedAt: Date

  /**
   * Maps the stored settings to their public data.
   *
   * @param settings - Stored settings.
   * @returns The public data of the settings.
   */
  static fromRecord(settings: SystemSettings): SettingsDto {
    return Object.assign(new SettingsDto(), {
      companyName: settings.companyName,
      companyAddress: settings.companyAddress,
      defaultValuationMethod: settings.defaultValuationMethod,
      lowStockAlertsEnabled: settings.lowStockAlertsEnabled,
      updatedAt: settings.updatedAt,
    })
  }
}

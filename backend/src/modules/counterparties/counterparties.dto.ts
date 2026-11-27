import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsOptional, ValidateIf } from 'class-validator'
import {
  IsBooleanQuery,
  IsOptionalEmail,
  IsOptionalText,
  IsRequiredText,
  IsSearchTerm,
} from '../../common/validators'
import type { Counterparty } from '../../generated/prisma/client'
import { CounterpartyType } from '../../generated/prisma/enums'

const MAX_NAME_LENGTH = 200
const MAX_TAXID_LENGTH = 50
const MAX_PHONE_LENGTH = 50
const MAX_ADDRESS_LENGTH = 500

/**
 * Data of a new counterparty.
 */
export class CreateCounterpartyDto {
  /** Name. */
  @IsRequiredText(MAX_NAME_LENGTH)
  name: string

  /** Whether it supplies goods, buys them, or both. */
  @ApiProperty({ enum: CounterpartyType, enumName: 'CounterpartyType' })
  @IsEnum(CounterpartyType)
  type: CounterpartyType

  /** Unique tax identification number. */
  @IsOptionalText(MAX_TAXID_LENGTH)
  taxId?: string | null

  /** Contact e-mail address. */
  @IsOptionalEmail()
  email?: string | null

  /** Contact phone number. */
  @IsOptionalText(MAX_PHONE_LENGTH)
  phone?: string | null

  /** Postal address. */
  @IsOptionalText(MAX_ADDRESS_LENGTH)
  address?: string | null
}

/**
 * Values of a counterparty to change; omitted values stay, `null` clears an optional one.
 */
export class UpdateCounterpartyDto extends PartialType(CreateCounterpartyDto, {
  skipNullProperties: false,
}) {
  /** `false` deactivates the counterparty, `true` restores it. */
  @ApiPropertyOptional()
  @ValidateIf((_target, fieldValue) => fieldValue !== undefined)
  @IsBoolean()
  isActive?: boolean
}

/**
 * Query parameters of the counterparty list.
 */
export class CounterpartyQueryDto {
  /** Only counterparties of exactly this type. */
  @ApiPropertyOptional({ enum: CounterpartyType, enumName: 'CounterpartyType' })
  @IsOptional()
  @IsEnum(CounterpartyType)
  type?: CounterpartyType

  /** Part of the name, tax number, e-mail address or phone number. */
  @IsSearchTerm()
  search?: string

  /** Only active or only deactivated counterparties. */
  @IsBooleanQuery()
  isActive?: boolean
}

/**
 * A counterparty as shown inside other records.
 */
export class CounterpartySummaryDto {
  /** Identifier. */
  @ApiProperty({ format: 'uuid' })
  id: string

  /** Name. */
  @ApiProperty()
  name: string

  /** Type. */
  @ApiProperty({ enum: CounterpartyType, enumName: 'CounterpartyType' })
  type: CounterpartyType

  /** Whether it can be chosen for new records. */
  @ApiProperty()
  isActive: boolean

  /**
   * Maps a stored counterparty to its summary.
   *
   * @param counterparty - Stored counterparty.
   * @returns The summary of that counterparty.
   */
  static fromRecord(counterparty: Counterparty): CounterpartySummaryDto {
    return Object.assign(new CounterpartySummaryDto(), {
      id: counterparty.id,
      name: counterparty.name,
      type: counterparty.type,
      isActive: counterparty.isActive,
    })
  }
}

/**
 * A supplier, a customer, or both.
 */
export class CounterpartyDto extends CounterpartySummaryDto {
  /** Tax identification number. */
  @ApiProperty({ type: String, nullable: true })
  taxId: string | null

  /** Contact e-mail address. */
  @ApiProperty({ type: String, nullable: true })
  email: string | null

  /** Contact phone number. */
  @ApiProperty({ type: String, nullable: true })
  phone: string | null

  /** Postal address. */
  @ApiProperty({ type: String, nullable: true })
  address: string | null

  /** Creation time. */
  @ApiProperty()
  createdAt: Date

  /** Time of the last change. */
  @ApiProperty()
  updatedAt: Date

  /**
   * Maps a stored counterparty to its public data.
   *
   * @param counterparty - Stored counterparty.
   * @returns The public data of that counterparty.
   */
  static override fromRecord(counterparty: Counterparty): CounterpartyDto {
    return Object.assign(new CounterpartyDto(), CounterpartySummaryDto.fromRecord(counterparty), {
      taxId: counterparty.taxId,
      email: counterparty.email,
      phone: counterparty.phone,
      address: counterparty.address,
      createdAt: counterparty.createdAt,
      updatedAt: counterparty.updatedAt,
    })
  }
}

import { ApiProperty, PartialType } from '@nestjs/swagger'
import { IsRequiredText } from '../../common/validators'
import type { Unit } from '../../generated/prisma/client'

const MAX_CODE_LENGTH = 20
const MAX_NAME_LENGTH = 100

/**
 * Data of a new unit of measure.
 */
export class CreateUnitDto {
  /** Unique short code, for example `kg`. */
  @IsRequiredText(MAX_CODE_LENGTH)
  code: string

  /** Unique name. */
  @IsRequiredText(MAX_NAME_LENGTH)
  name: string
}

/**
 * Values of a unit to change; omitted values stay, `null` is rejected.
 */
export class UpdateUnitDto extends PartialType(CreateUnitDto, { skipNullProperties: false }) {}

/**
 * A unit of measure.
 */
export class UnitDto {
  /** Identifier. */
  @ApiProperty({ format: 'uuid' })
  id: string

  /** Short code. */
  @ApiProperty()
  code: string

  /** Name. */
  @ApiProperty()
  name: string

  /**
   * Maps a stored unit to its public data.
   *
   * @param unit - Stored unit.
   * @returns The public data of that unit.
   */
  static fromRecord(unit: Unit): UnitDto {
    return Object.assign(new UnitDto(), { id: unit.id, code: unit.code, name: unit.name })
  }
}

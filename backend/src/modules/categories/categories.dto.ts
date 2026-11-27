import { ApiProperty, PartialType } from '@nestjs/swagger'
import { IsOptionalText, IsRequiredText } from '../../common/validators'
import type { Category } from '../../generated/prisma/client'

const MAX_NAME_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 1000

/**
 * Data of a new category.
 */
export class CreateCategoryDto {
  /** Unique name. */
  @IsRequiredText(MAX_NAME_LENGTH)
  name: string

  /** Description. */
  @IsOptionalText(MAX_DESCRIPTION_LENGTH)
  description?: string | null
}

/**
 * Values of a category to change; omitted values stay, `null` clears the description.
 */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto, {
  skipNullProperties: false,
}) {}

/**
 * A product category.
 */
export class CategoryDto {
  /** Identifier. */
  @ApiProperty({ format: 'uuid' })
  id: string

  /** Name. */
  @ApiProperty()
  name: string

  /** Description. */
  @ApiProperty({ type: String, nullable: true })
  description: string | null

  /**
   * Maps a stored category to its public data.
   *
   * @param category - Stored category.
   * @returns The public data of that category.
   */
  static fromRecord(category: Category): CategoryDto {
    return Object.assign(new CategoryDto(), {
      id: category.id,
      name: category.name,
      description: category.description,
    })
  }
}

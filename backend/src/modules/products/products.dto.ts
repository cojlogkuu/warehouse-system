import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator'
import { PageQueryDto } from '../../common/pagination.dto'
import {
  IsBooleanQuery,
  IsMoney,
  IsOptionalText,
  IsQuantity,
  IsRequiredText,
  IsSearchTerm,
  toMoney,
  toQuantity,
} from '../../common/validators'
import type { Prisma } from '../../generated/prisma/client'
import { CategoryDto } from '../categories/categories.dto'
import { CounterpartySummaryDto } from '../counterparties/counterparties.dto'
import { UnitDto } from '../units/units.dto'

const MAX_SKU_LENGTH = 64
const SKU_PATTERN = /^[A-Z0-9][A-Z0-9._-]*$/
const MAX_NAME_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 2000
const PRODUCT_SORT_FIELDS = ['name', 'sku', 'price', 'quantity', 'createdAt'] as const

/** Field the product list can be sorted by. */
export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number]

/** A stored product together with the records it refers to. */
export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: { category: true; unit: true; supplier: true }
}>

/**
 * Data of a new product. The quantity is not among them: only stock documents change it.
 */
export class CreateProductDto {
  /** Unique article number; stored in upper case. */
  @ApiProperty({ maxLength: MAX_SKU_LENGTH, pattern: SKU_PATTERN.source })
  @Transform(({ value: rawSku }: { value: unknown }) =>
    typeof rawSku === 'string' ? rawSku.trim().toUpperCase() : rawSku,
  )
  @Matches(SKU_PATTERN, {
    message:
      'sku must start with a letter or digit and contain only letters, digits, ".", "_" and "-"',
  })
  @MaxLength(MAX_SKU_LENGTH)
  sku: string

  /** Name. */
  @IsRequiredText(MAX_NAME_LENGTH)
  name: string

  /** Description. */
  @IsOptionalText(MAX_DESCRIPTION_LENGTH)
  description?: string | null

  /** Category of the product. */
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoryId: string

  /** Unit of measure. */
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  unitId: string

  /** Usual supplier: an active counterparty of type SUPPLIER or BOTH. */
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  supplierId?: string | null

  /** Selling price. */
  @IsMoney()
  price: string

  /** Level at or below which the stock is low; 0 (the default) means no threshold. */
  @IsQuantity({ optional: true })
  minStockLevel?: string
}

/**
 * Values of a product to change; omitted values stay, `null` clears an optional one.
 */
export class UpdateProductDto extends PartialType(CreateProductDto, {
  skipNullProperties: false,
}) {
  /** `false` deactivates the product, `true` restores it. */
  @ApiPropertyOptional()
  @ValidateIf((_target, fieldValue) => fieldValue !== undefined)
  @IsBoolean()
  isActive?: boolean
}

/**
 * Query parameters of the product list.
 */
export class ProductQueryDto extends PageQueryDto {
  /** Part of the name or of the article number. */
  @IsSearchTerm()
  search?: string

  /** Only products of this category. */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string

  /** Only products whose stock is low, or only those whose stock is not. */
  @IsBooleanQuery()
  lowStock?: boolean

  /** Only active or only deactivated products. */
  @IsBooleanQuery()
  isActive?: boolean

  /** Field the list is sorted by. */
  @ApiPropertyOptional({ enum: PRODUCT_SORT_FIELDS, default: 'name' })
  @IsIn(PRODUCT_SORT_FIELDS)
  sortBy: ProductSortField = 'name'
}

/**
 * A catalog item with its current stock level.
 */
export class ProductDto {
  /** Identifier. */
  @ApiProperty({ format: 'uuid' })
  id: string

  /** Article number. */
  @ApiProperty()
  sku: string

  /** Name. */
  @ApiProperty()
  name: string

  /** Description. */
  @ApiProperty({ type: String, nullable: true })
  description: string | null

  /** Category. */
  @ApiProperty({ type: CategoryDto })
  category: CategoryDto

  /** Unit of measure. */
  @ApiProperty({ type: UnitDto })
  unit: UnitDto

  /** Usual supplier. */
  @ApiProperty({ type: CounterpartySummaryDto, nullable: true })
  supplier: CounterpartySummaryDto | null

  /** Selling price. */
  @ApiProperty({ example: '12.50' })
  price: string

  /** Quantity on hand; read-only. */
  @ApiProperty({ example: '3.000', readOnly: true })
  quantity: string

  /** Low-stock threshold; 0 means none. */
  @ApiProperty({ example: '5.000' })
  minStockLevel: string

  /** Whether there is a threshold and the quantity is at or below it. */
  @ApiProperty()
  lowStock: boolean

  /** Whether the product is in use. */
  @ApiProperty()
  isActive: boolean

  /** Creation time. */
  @ApiProperty()
  createdAt: Date

  /** Time of the last change. */
  @ApiProperty()
  updatedAt: Date

  /**
   * Maps a stored product to its public data.
   *
   * @param product - Stored product with its category, unit and supplier.
   * @returns The public data of that product.
   */
  static fromRecord(product: ProductWithRelations): ProductDto {
    const { quantity, minStockLevel, supplier } = product
    return Object.assign(new ProductDto(), {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      category: CategoryDto.fromRecord(product.category),
      unit: UnitDto.fromRecord(product.unit),
      supplier: supplier ? CounterpartySummaryDto.fromRecord(supplier) : null,
      price: toMoney(product.price),
      quantity: toQuantity(quantity),
      minStockLevel: toQuantity(minStockLevel),
      // The same rule as the `lowStock` filter of the repository
      lowStock: minStockLevel.greaterThan(0) && quantity.lessThanOrEqualTo(minStockLevel),
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    })
  }
}

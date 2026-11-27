import { type Type as ClassType, applyDecorators } from '@nestjs/common'
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsIn, IsInt, Max, Min } from 'class-validator'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100
/** Keeps the number of skipped records within what the database accepts. */
const MAX_PAGE = 1_000_000
const SORT_ORDERS = ['asc', 'desc'] as const

/** Direction of a sorted list. */
export type SortOrder = (typeof SORT_ORDERS)[number]

/**
 * Query parameters shared by all paginated lists. A list adds its filters and the fields it can
 * be sorted by.
 */
export class PageQueryDto {
  /** Number of the page, starting with 1. */
  @ApiPropertyOptional({ type: 'integer', minimum: 1, maximum: MAX_PAGE, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE)
  page = 1

  /** Number of records per page. */
  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize: number = DEFAULT_PAGE_SIZE

  /** Direction of the sorting. */
  @ApiPropertyOptional({ enum: SORT_ORDERS, default: 'asc' })
  @IsIn(SORT_ORDERS)
  sortOrder: SortOrder = 'asc'
}

/**
 * One page of a list. The schema of the items is documented by `ApiPageResponse`.
 */
export class PageDto<T> {
  /** Records of the page. */
  items: T[]

  /** Number of records that match the filters, on all pages. */
  @ApiProperty({ type: 'integer' })
  total: number

  /** Number of this page. */
  @ApiProperty({ type: 'integer' })
  page: number

  /** Requested number of records per page. */
  @ApiProperty({ type: 'integer' })
  pageSize: number

  /**
   * Builds a page.
   *
   * @param records - Records of the page.
   * @param total - Number of records on all pages.
   * @param pageQuery - Query that selected the page.
   * @returns The page.
   */
  static fromRecords<T>(records: T[], total: number, pageQuery: PageQueryDto): PageDto<T> {
    return Object.assign(new PageDto<T>(), {
      items: records,
      total,
      page: pageQuery.page,
      pageSize: pageQuery.pageSize,
    })
  }
}

/**
 * Documents a successful response that is one page of the given records.
 *
 * @param recordType - DTO class of a record.
 * @returns The method decorator.
 */
export function ApiPageResponse(recordType: ClassType): MethodDecorator {
  return applyDecorators(
    ApiExtraModels(PageDto, recordType),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(PageDto) },
          {
            type: 'object',
            required: ['items'],
            properties: { items: { type: 'array', items: { $ref: getSchemaPath(recordType) } } },
          },
        ],
      },
    }),
  )
}

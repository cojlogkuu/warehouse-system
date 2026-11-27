import { Injectable } from '@nestjs/common'
import type { SortOrder } from '../../common/pagination.dto'
import type { Prisma } from '../../generated/prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { escapeLikePattern } from '../../prisma/prisma.utils'
import type { ProductSortField, ProductWithRelations } from './products.dto'

/** Records loaded together with a product. */
const RELATIONS = { category: true, unit: true, supplier: true } as const

/** Optional conditions of the product list. */
export interface ProductFilter {
  /** Part of the name or of the article number, case-insensitive. */
  search?: string
  /** Category of the products. */
  categoryId?: string
  /** Whether the stock of the products is low. */
  lowStock?: boolean
  /** Whether the products are active. */
  isActive?: boolean
}

/** Order and position of a page of products. */
export interface ProductPage {
  /** Number of the page, starting with 1. */
  page: number
  /** Number of products per page. */
  pageSize: number
  /** Field the list is sorted by. */
  sortBy: ProductSortField
  /** Direction of the sorting. */
  sortOrder: SortOrder
}

/**
 * Data access for the `Product` entity.
 */
@Injectable()
export class ProductsRepository {
  /**
   * Creates the repository.
   *
   * @param prisma - Database client.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reads one page of products and counts all matching ones, both from one snapshot.
   *
   * @param filter - Conditions the products must meet.
   * @param page - Order and position of the page.
   * @returns The products of the page and the total number of matches.
   */
  findPage(
    filter: ProductFilter,
    { page, pageSize, sortBy, sortOrder }: ProductPage,
  ): Promise<[ProductWithRelations[], number]> {
    const where = this.toWhere(filter)
    // The identifier breaks ties, so that pages never overlap
    const orderBy: Prisma.ProductOrderByWithRelationInput[] = [
      { [sortBy]: sortOrder },
      { id: 'asc' },
    ]
    return this.prisma.$transaction(
      [
        this.prisma.product.findMany({
          where,
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: RELATIONS,
        }),
        this.prisma.product.count({ where }),
      ],
      { isolationLevel: 'RepeatableRead' },
    )
  }

  /**
   * Finds a product by identifier.
   *
   * @param id - Identifier of the product.
   * @returns The product, or `null` if there is none.
   */
  findById(id: string): Promise<ProductWithRelations | null> {
    return this.prisma.product.findUnique({ where: { id }, include: RELATIONS })
  }

  /**
   * Inserts a product.
   *
   * @param data - Values of the new product.
   * @returns The created product.
   */
  create(data: Prisma.ProductUncheckedCreateInput): Promise<ProductWithRelations> {
    return this.prisma.product.create({ data, include: RELATIONS })
  }

  /**
   * Updates a product.
   *
   * @param id - Identifier of the product.
   * @param data - Values to change.
   * @returns The changed product.
   */
  update(id: string, data: Prisma.ProductUncheckedUpdateInput): Promise<ProductWithRelations> {
    return this.prisma.product.update({ where: { id }, data, include: RELATIONS })
  }

  /**
   * Translates the conditions of the list into a database filter.
   *
   * @param filter - Conditions the products must meet.
   * @returns The database filter.
   */
  private toWhere({
    search,
    categoryId,
    lowStock,
    isActive,
  }: ProductFilter): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = { categoryId, isActive }
    if (search) {
      const contains = escapeLikePattern(search)
      where.OR = [
        { name: { contains, mode: 'insensitive' } },
        { sku: { contains, mode: 'insensitive' } },
      ]
    }
    if (lowStock !== undefined) {
      const threshold = this.prisma.product.fields.minStockLevel
      // Low: there is a threshold and the quantity is at or below it. Otherwise: the complement
      where.AND = lowStock
        ? { minStockLevel: { gt: 0 }, quantity: { lte: threshold } }
        : { OR: [{ minStockLevel: { lte: 0 } }, { quantity: { gt: threshold } }] }
    }
    return where
  }
}

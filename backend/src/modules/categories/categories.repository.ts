import { Injectable } from '@nestjs/common'
import type { Prisma, Category } from '../../generated/prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * Data access for the `Category` entity.
 */
@Injectable()
export class CategoriesRepository {
  /**
   * Creates the repository.
   *
   * @param prisma - Database client.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists all categories ordered by name.
   *
   * @returns The categories.
   */
  findMany(): Promise<Category[]> {
    return this.prisma.category.findMany({ orderBy: [{ name: 'asc' }, { id: 'asc' }] })
  }

  /**
   * Finds a category by identifier.
   *
   * @param id - Identifier of the category.
   * @returns The category, or `null` if there is none.
   */
  findById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { id } })
  }

  /**
   * Counts the products that use a category.
   *
   * @param id - Identifier of the category.
   * @returns The number of products, deactivated ones included.
   */
  countProducts(id: string): Promise<number> {
    return this.prisma.product.count({ where: { categoryId: id } })
  }

  /**
   * Inserts a category.
   *
   * @param data - Values of the new category.
   * @returns The created category.
   */
  create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return this.prisma.category.create({ data })
  }

  /**
   * Updates a category.
   *
   * @param id - Identifier of the category.
   * @param data - Values to change.
   * @returns The changed category.
   */
  update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data })
  }

  /**
   * Deletes a category.
   *
   * @param id - Identifier of the category.
   * @returns A promise that resolves once the category is deleted.
   */
  async delete(id: string): Promise<void> {
    await this.prisma.category.delete({ where: { id } })
  }
}

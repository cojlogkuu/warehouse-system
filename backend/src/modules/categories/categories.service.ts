import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import {
  violatesForeignKey,
  isMissingRecord,
  violatesUniqueConstraint,
} from '../../prisma/prisma.utils'
import { type CreateCategoryDto, type UpdateCategoryDto, CategoryDto } from './categories.dto'
import { CategoriesRepository } from './categories.repository'

/**
 * Application logic of product categories. A category can be deleted only while no product uses it.
 */
@Injectable()
export class CategoriesService {
  /**
   * Creates the service.
   *
   * @param categories - Data access for categories.
   */
  constructor(private readonly categories: CategoriesRepository) {}

  /**
   * Lists all categories.
   *
   * @returns The categories ordered by name.
   */
  async listCategories(): Promise<CategoryDto[]> {
    const categories = await this.categories.findMany()
    return categories.map((category) => CategoryDto.fromRecord(category))
  }

  /**
   * Returns one category.
   *
   * @param id - Identifier of the category.
   * @returns The category.
   * @throws NotFoundException if there is no such category.
   */
  async findCategory(id: string): Promise<CategoryDto> {
    const category = await this.categories.findById(id)
    if (!category) {
      throw this.categoryNotFound()
    }
    return CategoryDto.fromRecord(category)
  }

  /**
   * Creates a category.
   *
   * @param newCategory - Data of the new category.
   * @returns The created category.
   * @throws ConflictException if the name is already taken.
   */
  async createCategory(newCategory: CreateCategoryDto): Promise<CategoryDto> {
    try {
      return CategoryDto.fromRecord(
        await this.categories.create({
          name: newCategory.name,
          description: newCategory.description,
        }),
      )
    } catch (error) {
      throw this.translateWriteError(error)
    }
  }

  /**
   * Changes a category.
   *
   * @param id - Identifier of the category.
   * @param categoryChanges - Values to change.
   * @returns The changed category.
   * @throws NotFoundException if there is no such category.
   * @throws ConflictException if the name is already taken.
   */
  async updateCategory(id: string, categoryChanges: UpdateCategoryDto): Promise<CategoryDto> {
    try {
      return CategoryDto.fromRecord(
        await this.categories.update(id, {
          name: categoryChanges.name,
          description: categoryChanges.description,
        }),
      )
    } catch (error) {
      throw this.translateWriteError(error)
    }
  }

  /**
   * Deletes an unused category.
   *
   * @param id - Identifier of the category.
   * @returns A promise that resolves once the category is deleted.
   * @throws NotFoundException if there is no such category.
   * @throws ConflictException if products use the category.
   */
  async deleteCategory(id: string): Promise<void> {
    const productCount = await this.categories.countProducts(id)
    if (productCount > 0) {
      const usageText = productCount === 1 ? '1 product' : `${productCount.toString()} products`
      throw new ConflictException(`The category is used by ${usageText} and cannot be deleted`)
    }
    try {
      await this.categories.delete(id)
    } catch (error) {
      // A product may have taken the category since it was counted
      if (violatesForeignKey(error)) {
        throw new ConflictException('The category is used by products and cannot be deleted')
      }
      throw this.translateWriteError(error)
    }
  }

  /**
   * Builds the error for an unknown identifier.
   *
   * @returns The error.
   */
  private categoryNotFound(): NotFoundException {
    return new NotFoundException('Category not found')
  }

  /**
   * Explains a rejected write.
   *
   * @param error - Error of a write to the categories table.
   * @returns The error to answer with, or the error itself if it is unexpected.
   */
  private translateWriteError(error: unknown): unknown {
    if (violatesUniqueConstraint(error)) {
      return new ConflictException('A category with this name already exists')
    }
    return isMissingRecord(error) ? this.categoryNotFound() : error
  }
}

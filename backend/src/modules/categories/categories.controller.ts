import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger'
import { Roles } from '../../common/decorators/roles.decorator'
import { Role } from '../../generated/prisma/enums'
import { CreateCategoryDto, UpdateCategoryDto, CategoryDto } from './categories.dto'
import { CategoriesService } from './categories.service'

/**
 * REST routes of product categories. Everyone may read; administrators and managers
 * may write.
 */
@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  /**
   * Creates the controller.
   *
   * @param categories - Application logic of categories.
   */
  constructor(private readonly categories: CategoriesService) {}

  /**
   * Lists categories.
   *
   * @returns All categories.
   */
  @Get()
  @ApiOkResponse({ type: [CategoryDto] })
  listCategories(): Promise<CategoryDto[]> {
    return this.categories.listCategories()
  }

  /**
   * Shows one category.
   *
   * @param id - Identifier of the category.
   * @returns The category.
   */
  @Get(':id')
  @ApiOkResponse({ type: CategoryDto })
  showCategory(@Param('id', ParseUUIDPipe) id: string): Promise<CategoryDto> {
    return this.categories.findCategory(id)
  }

  /**
   * Creates a category.
   *
   * @param newCategory - Data of the new category.
   * @returns The created category.
   */
  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiCreatedResponse({ type: CategoryDto })
  createCategory(@Body() newCategory: CreateCategoryDto): Promise<CategoryDto> {
    return this.categories.createCategory(newCategory)
  }

  /**
   * Changes a category.
   *
   * @param id - Identifier of the category.
   * @param categoryChanges - Values to change.
   * @returns The changed category.
   */
  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOkResponse({ type: CategoryDto })
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() categoryChanges: UpdateCategoryDto,
  ): Promise<CategoryDto> {
    return this.categories.updateCategory(id, categoryChanges)
  }

  /**
   * Deletes an unused category.
   *
   * @param id - Identifier of the category.
   * @returns A promise that resolves once the category is deleted.
   */
  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  deleteCategory(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.categories.deleteCategory(id)
  }
}

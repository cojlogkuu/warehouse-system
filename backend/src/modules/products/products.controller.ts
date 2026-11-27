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
  Query,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger'
import { Roles } from '../../common/decorators/roles.decorator'
import { ApiPageResponse, type PageDto } from '../../common/pagination.dto'
import { Role } from '../../generated/prisma/enums'
import { CreateProductDto, ProductDto, ProductQueryDto, UpdateProductDto } from './products.dto'
import { ProductsService } from './products.service'

/**
 * REST routes of the product catalog. Everyone may read; administrators and managers may write.
 */
@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  /**
   * Creates the controller.
   *
   * @param products - Application logic of products.
   */
  constructor(private readonly products: ProductsService) {}

  /**
   * Lists products page by page.
   *
   * @param productQuery - Conditions, order and position of the page.
   * @returns The page.
   */
  @Get()
  @ApiPageResponse(ProductDto)
  listProducts(@Query() productQuery: ProductQueryDto): Promise<PageDto<ProductDto>> {
    return this.products.listProducts(productQuery)
  }

  /**
   * Shows one product.
   *
   * @param id - Identifier of the product.
   * @returns The product.
   */
  @Get(':id')
  @ApiOkResponse({ type: ProductDto })
  showProduct(@Param('id', ParseUUIDPipe) id: string): Promise<ProductDto> {
    return this.products.findProduct(id)
  }

  /**
   * Creates a product.
   *
   * @param newProduct - Data of the new product.
   * @returns The created product.
   */
  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiCreatedResponse({ type: ProductDto })
  createProduct(@Body() newProduct: CreateProductDto): Promise<ProductDto> {
    return this.products.createProduct(newProduct)
  }

  /**
   * Changes, deactivates or restores a product.
   *
   * @param id - Identifier of the product.
   * @param productChanges - Values to change.
   * @returns The changed product.
   */
  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOkResponse({ type: ProductDto })
  updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() productChanges: UpdateProductDto,
  ): Promise<ProductDto> {
    return this.products.updateProduct(id, productChanges)
  }

  /**
   * Deactivates a product.
   *
   * @param id - Identifier of the product.
   * @returns A promise that resolves once the product is inactive.
   */
  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  deactivateProduct(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.products.deactivateProduct(id)
  }
}

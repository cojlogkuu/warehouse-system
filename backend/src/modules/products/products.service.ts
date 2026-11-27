import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { PageDto } from '../../common/pagination.dto'
import { CounterpartyType } from '../../generated/prisma/enums'
import {
  violatesForeignKey,
  isMissingRecord,
  violatesUniqueConstraint,
  violatedConstraint,
} from '../../prisma/prisma.utils'
import { CounterpartiesService } from '../counterparties/counterparties.service'
import {
  type CreateProductDto,
  ProductDto,
  type ProductQueryDto,
  type ProductWithRelations,
  type UpdateProductDto,
} from './products.dto'
import { ProductsRepository } from './products.repository'

/** Types of counterparty that can supply a product. */
const SUPPLIER_TYPES: CounterpartyType[] = [CounterpartyType.SUPPLIER, CounterpartyType.BOTH]

/** Messages for the foreign keys of a product, by the name of the constraint. */
const MISSING_REFERENCE_MESSAGES = new Map([
  ['products_category_id_fkey', 'Category not found'],
  ['products_unit_id_fkey', 'Unit not found'],
  ['products_supplier_id_fkey', 'Counterparty not found'],
])

/**
 * Application logic of the product catalog. Products are never deleted, only deactivated. Their
 * quantity is changed by stock documents only.
 */
@Injectable()
export class ProductsService {
  /**
   * Creates the service.
   *
   * @param products - Data access for products.
   * @param counterparties - Checks the supplier of a product.
   */
  constructor(
    private readonly products: ProductsRepository,
    private readonly counterparties: CounterpartiesService,
  ) {}

  /**
   * Lists one page of products.
   *
   * @param productQuery - Conditions, order and position of the page.
   * @returns The page.
   */
  async listProducts(productQuery: ProductQueryDto): Promise<PageDto<ProductDto>> {
    const [products, totalCount] = await this.products.findPage(productQuery, productQuery)
    return PageDto.fromRecords(
      products.map((product) => ProductDto.fromRecord(product)),
      totalCount,
      productQuery,
    )
  }

  /**
   * Returns one product, active or not.
   *
   * @param id - Identifier of the product.
   * @returns The product.
   * @throws NotFoundException if there is no such product.
   */
  async findProduct(id: string): Promise<ProductDto> {
    return ProductDto.fromRecord(await this.getExistingProduct(id))
  }

  /**
   * Creates an active product with nothing in stock.
   *
   * @param newProduct - Data of the new product.
   * @returns The created product.
   * @throws UnprocessableEntityException if the category, unit or supplier cannot be used.
   * @throws ConflictException if the article number is already taken.
   */
  async createProduct(newProduct: CreateProductDto): Promise<ProductDto> {
    await this.assertSupplierAllowed(newProduct.supplierId)
    try {
      const product = await this.products.create({
        sku: newProduct.sku,
        name: newProduct.name,
        description: newProduct.description,
        categoryId: newProduct.categoryId,
        unitId: newProduct.unitId,
        supplierId: newProduct.supplierId,
        price: newProduct.price,
        minStockLevel: newProduct.minStockLevel,
      })
      return ProductDto.fromRecord(product)
    } catch (error) {
      throw this.translateWriteError(error)
    }
  }

  /**
   * Changes, deactivates or restores a product. A supplier is checked only when it is sent.
   *
   * @param id - Identifier of the product.
   * @param productChanges - Values to change.
   * @returns The changed product.
   * @throws NotFoundException if there is no such product.
   * @throws UnprocessableEntityException if the category, unit or supplier cannot be used.
   * @throws ConflictException if the article number is already taken.
   */
  async updateProduct(id: string, productChanges: UpdateProductDto): Promise<ProductDto> {
    // An unknown product is reported before anything that is wrong with the new values
    await this.getExistingProduct(id)
    await this.assertSupplierAllowed(productChanges.supplierId)
    try {
      const product = await this.products.update(id, {
        sku: productChanges.sku,
        name: productChanges.name,
        description: productChanges.description,
        categoryId: productChanges.categoryId,
        unitId: productChanges.unitId,
        supplierId: productChanges.supplierId,
        price: productChanges.price,
        minStockLevel: productChanges.minStockLevel,
        isActive: productChanges.isActive,
      })
      return ProductDto.fromRecord(product)
    } catch (error) {
      throw this.translateWriteError(error)
    }
  }

  /**
   * Deactivates a product. Repeating it changes nothing.
   *
   * @param id - Identifier of the product.
   * @returns A promise that resolves once the product is inactive.
   * @throws NotFoundException if there is no such product.
   */
  async deactivateProduct(id: string): Promise<void> {
    try {
      await this.products.update(id, { isActive: false })
    } catch (error) {
      throw this.translateWriteError(error)
    }
  }

  /**
   * Reads a product that must exist.
   *
   * @param id - Identifier of the product.
   * @returns The product.
   * @throws NotFoundException if there is no such product.
   */
  private async getExistingProduct(id: string): Promise<ProductWithRelations> {
    const product = await this.products.findById(id)
    if (!product) {
      throw this.productNotFound()
    }
    return product
  }

  /**
   * Checks a supplier named in a request.
   *
   * @param supplierId - The new supplier; nothing to check if omitted or removed.
   * @returns A promise that resolves if the supplier can be used.
   * @throws UnprocessableEntityException if it cannot.
   */
  private async assertSupplierAllowed(supplierId: string | null | undefined): Promise<void> {
    if (supplierId) {
      await this.counterparties.assertCounterpartyType(supplierId, SUPPLIER_TYPES)
    }
  }

  /**
   * Builds the error for an unknown identifier.
   *
   * @returns The error.
   */
  private productNotFound(): NotFoundException {
    return new NotFoundException('Product not found')
  }

  /**
   * Explains a rejected write. The foreign keys are what guarantees that the category and the
   * unit exist.
   *
   * @param error - Error of a write to the products table.
   * @returns The error to answer with, or the error itself if it is unexpected.
   */
  private translateWriteError(error: unknown): unknown {
    if (violatesUniqueConstraint(error)) {
      return new ConflictException('A product with this SKU already exists')
    }
    if (violatesForeignKey(error)) {
      return new UnprocessableEntityException(
        MISSING_REFERENCE_MESSAGES.get(violatedConstraint(error) ?? '') ??
          'The referenced category, unit or supplier does not exist',
      )
    }
    return isMissingRecord(error) ? this.productNotFound() : error
  }
}

import { Module } from '@nestjs/common'
import { CounterpartiesModule } from '../counterparties/counterparties.module'
import { ProductsController } from './products.controller'
import { ProductsRepository } from './products.repository'
import { ProductsService } from './products.service'

/**
 * Product catalog.
 */
@Module({
  imports: [CounterpartiesModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsRepository],
})
export class ProductsModule {}

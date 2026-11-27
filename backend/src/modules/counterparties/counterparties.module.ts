import { Module } from '@nestjs/common'
import { CounterpartiesController } from './counterparties.controller'
import { CounterpartiesRepository } from './counterparties.repository'
import { CounterpartiesService } from './counterparties.service'

/**
 * Suppliers and customers.
 */
@Module({
  controllers: [CounterpartiesController],
  providers: [CounterpartiesService, CounterpartiesRepository],
  exports: [CounterpartiesService],
})
export class CounterpartiesModule {}

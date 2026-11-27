import { Module } from '@nestjs/common'
import { UnitsController } from './units.controller'
import { UnitsRepository } from './units.repository'
import { UnitsService } from './units.service'

/**
 * Units of measure.
 */
@Module({
  controllers: [UnitsController],
  providers: [UnitsService, UnitsRepository],
})
export class UnitsModule {}

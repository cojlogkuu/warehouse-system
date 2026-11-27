import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import {
  violatesForeignKey,
  isMissingRecord,
  violatesUniqueConstraint,
  violatedConstraint,
} from '../../prisma/prisma.utils'
import { type CreateUnitDto, type UpdateUnitDto, UnitDto } from './units.dto'
import { UnitsRepository } from './units.repository'

/**
 * Application logic of units of measure. A unit can be deleted only while no product uses it.
 */
@Injectable()
export class UnitsService {
  /**
   * Creates the service.
   *
   * @param units - Data access for units.
   */
  constructor(private readonly units: UnitsRepository) {}

  /**
   * Lists all units.
   *
   * @returns The units ordered by name.
   */
  async listUnits(): Promise<UnitDto[]> {
    const units = await this.units.findMany()
    return units.map((unit) => UnitDto.fromRecord(unit))
  }

  /**
   * Returns one unit.
   *
   * @param id - Identifier of the unit.
   * @returns The unit.
   * @throws NotFoundException if there is no such unit.
   */
  async findUnit(id: string): Promise<UnitDto> {
    const unit = await this.units.findById(id)
    if (!unit) {
      throw this.unitNotFound()
    }
    return UnitDto.fromRecord(unit)
  }

  /**
   * Creates a unit.
   *
   * @param newUnit - Data of the new unit.
   * @returns The created unit.
   * @throws ConflictException if the code or the name is already taken.
   */
  async createUnit(newUnit: CreateUnitDto): Promise<UnitDto> {
    try {
      return UnitDto.fromRecord(await this.units.create({ code: newUnit.code, name: newUnit.name }))
    } catch (error) {
      throw this.translateWriteError(error)
    }
  }

  /**
   * Changes a unit.
   *
   * @param id - Identifier of the unit.
   * @param unitChanges - Values to change.
   * @returns The changed unit.
   * @throws NotFoundException if there is no such unit.
   * @throws ConflictException if the code or the name is already taken.
   */
  async updateUnit(id: string, unitChanges: UpdateUnitDto): Promise<UnitDto> {
    try {
      return UnitDto.fromRecord(
        await this.units.update(id, { code: unitChanges.code, name: unitChanges.name }),
      )
    } catch (error) {
      throw this.translateWriteError(error)
    }
  }

  /**
   * Deletes an unused unit.
   *
   * @param id - Identifier of the unit.
   * @returns A promise that resolves once the unit is deleted.
   * @throws NotFoundException if there is no such unit.
   * @throws ConflictException if products use the unit.
   */
  async deleteUnit(id: string): Promise<void> {
    const productCount = await this.units.countProducts(id)
    if (productCount > 0) {
      const usageText = productCount === 1 ? '1 product' : `${productCount.toString()} products`
      throw new ConflictException(`The unit is used by ${usageText} and cannot be deleted`)
    }
    try {
      await this.units.delete(id)
    } catch (error) {
      // A product may have taken the unit since it was counted
      if (violatesForeignKey(error)) {
        throw new ConflictException('The unit is used by products and cannot be deleted')
      }
      throw this.translateWriteError(error)
    }
  }

  /**
   * Builds the error for an unknown identifier.
   *
   * @returns The error.
   */
  private unitNotFound(): NotFoundException {
    return new NotFoundException('Unit not found')
  }

  /**
   * Explains a rejected write.
   *
   * @param error - Error of a write to the units table.
   * @returns The error to answer with, or the error itself if it is unexpected.
   */
  private translateWriteError(error: unknown): unknown {
    if (violatesUniqueConstraint(error)) {
      const duplicateField = violatedConstraint(error) === 'units_code_key' ? 'code' : 'name'
      return new ConflictException(`A unit with this ${duplicateField} already exists`)
    }
    return isMissingRecord(error) ? this.unitNotFound() : error
  }
}

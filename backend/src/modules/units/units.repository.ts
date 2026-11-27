import { Injectable } from '@nestjs/common'
import type { Prisma, Unit } from '../../generated/prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * Data access for the `Unit` entity.
 */
@Injectable()
export class UnitsRepository {
  /**
   * Creates the repository.
   *
   * @param prisma - Database client.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists all units ordered by name.
   *
   * @returns The units.
   */
  findMany(): Promise<Unit[]> {
    return this.prisma.unit.findMany({ orderBy: [{ name: 'asc' }, { id: 'asc' }] })
  }

  /**
   * Finds a unit by identifier.
   *
   * @param id - Identifier of the unit.
   * @returns The unit, or `null` if there is none.
   */
  findById(id: string): Promise<Unit | null> {
    return this.prisma.unit.findUnique({ where: { id } })
  }

  /**
   * Counts the products that use a unit.
   *
   * @param id - Identifier of the unit.
   * @returns The number of products, deactivated ones included.
   */
  countProducts(id: string): Promise<number> {
    return this.prisma.product.count({ where: { unitId: id } })
  }

  /**
   * Inserts a unit.
   *
   * @param data - Values of the new unit.
   * @returns The created unit.
   */
  create(data: Prisma.UnitCreateInput): Promise<Unit> {
    return this.prisma.unit.create({ data })
  }

  /**
   * Updates a unit.
   *
   * @param id - Identifier of the unit.
   * @param data - Values to change.
   * @returns The changed unit.
   */
  update(id: string, data: Prisma.UnitUpdateInput): Promise<Unit> {
    return this.prisma.unit.update({ where: { id }, data })
  }

  /**
   * Deletes a unit.
   *
   * @param id - Identifier of the unit.
   * @returns A promise that resolves once the unit is deleted.
   */
  async delete(id: string): Promise<void> {
    await this.prisma.unit.delete({ where: { id } })
  }
}

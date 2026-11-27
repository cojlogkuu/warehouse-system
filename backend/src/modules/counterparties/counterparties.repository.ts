import { Injectable } from '@nestjs/common'
import type { Counterparty, Prisma } from '../../generated/prisma/client'
import type { CounterpartyType } from '../../generated/prisma/enums'
import { PrismaService } from '../../prisma/prisma.service'
import { escapeLikePattern } from '../../prisma/prisma.utils'

/** Optional conditions of the counterparty list. */
export interface CounterpartyFilter {
  /** Type of the counterparties. */
  type?: CounterpartyType
  /** Part of the name, tax number, e-mail address or phone number, case-insensitive. */
  search?: string
  /** Whether the counterparties are active. */
  isActive?: boolean
}

/**
 * Data access for the `Counterparty` entity.
 */
@Injectable()
export class CounterpartiesRepository {
  /**
   * Creates the repository.
   *
   * @param prisma - Database client.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists counterparties ordered by name.
   *
   * @param filter - Conditions the counterparties must meet.
   * @returns The matching counterparties.
   */
  findMany({ type, search, isActive }: CounterpartyFilter): Promise<Counterparty[]> {
    const where: Prisma.CounterpartyWhereInput = { type, isActive }
    if (search) {
      const contains = escapeLikePattern(search)
      where.OR = [
        { name: { contains, mode: 'insensitive' } },
        { taxId: { contains, mode: 'insensitive' } },
        { email: { contains, mode: 'insensitive' } },
        { phone: { contains, mode: 'insensitive' } },
      ]
    }
    return this.prisma.counterparty.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }] })
  }

  /**
   * Finds a counterparty by identifier.
   *
   * @param id - Identifier of the counterparty.
   * @returns The counterparty, or `null` if there is none.
   */
  findById(id: string): Promise<Counterparty | null> {
    return this.prisma.counterparty.findUnique({ where: { id } })
  }

  /**
   * Inserts a counterparty.
   *
   * @param data - Values of the new counterparty.
   * @returns The created counterparty.
   */
  create(data: Prisma.CounterpartyCreateInput): Promise<Counterparty> {
    return this.prisma.counterparty.create({ data })
  }

  /**
   * Updates a counterparty.
   *
   * @param id - Identifier of the counterparty.
   * @param data - Values to change.
   * @returns The changed counterparty.
   */
  update(id: string, data: Prisma.CounterpartyUpdateInput): Promise<Counterparty> {
    return this.prisma.counterparty.update({ where: { id }, data })
  }
}

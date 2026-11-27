import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import type { Counterparty } from '../../generated/prisma/client'
import type { CounterpartyType } from '../../generated/prisma/enums'
import { isMissingRecord, violatesUniqueConstraint } from '../../prisma/prisma.utils'
import {
  CounterpartyDto,
  type CounterpartyQueryDto,
  type CreateCounterpartyDto,
  type UpdateCounterpartyDto,
} from './counterparties.dto'
import { CounterpartiesRepository } from './counterparties.repository'

/**
 * Application logic of suppliers and customers. They are never deleted, only deactivated.
 */
@Injectable()
export class CounterpartiesService {
  /**
   * Creates the service.
   *
   * @param counterparties - Data access for counterparties.
   */
  constructor(private readonly counterparties: CounterpartiesRepository) {}

  /**
   * Lists counterparties.
   *
   * @param counterpartyQuery - Conditions the counterparties must meet.
   * @returns The matching counterparties ordered by name.
   */
  async listCounterparties(counterpartyQuery: CounterpartyQueryDto): Promise<CounterpartyDto[]> {
    const counterparties = await this.counterparties.findMany(counterpartyQuery)
    return counterparties.map((counterparty) => CounterpartyDto.fromRecord(counterparty))
  }

  /**
   * Returns one counterparty, active or not.
   *
   * @param id - Identifier of the counterparty.
   * @returns The counterparty.
   * @throws NotFoundException if there is no such counterparty.
   */
  async findCounterparty(id: string): Promise<CounterpartyDto> {
    const counterparty = await this.counterparties.findById(id)
    if (!counterparty) {
      throw this.counterpartyNotFound()
    }
    return CounterpartyDto.fromRecord(counterparty)
  }

  /**
   * Creates an active counterparty.
   *
   * @param newCounterparty - Data of the new counterparty.
   * @returns The created counterparty.
   * @throws ConflictException if the tax number is already taken.
   */
  async createCounterparty(newCounterparty: CreateCounterpartyDto): Promise<CounterpartyDto> {
    try {
      const counterparty = await this.counterparties.create({
        name: newCounterparty.name,
        type: newCounterparty.type,
        taxId: newCounterparty.taxId,
        email: newCounterparty.email,
        phone: newCounterparty.phone,
        address: newCounterparty.address,
      })
      return CounterpartyDto.fromRecord(counterparty)
    } catch (error) {
      throw this.translateWriteError(error)
    }
  }

  /**
   * Changes, deactivates or restores a counterparty.
   *
   * @param id - Identifier of the counterparty.
   * @param counterpartyChanges - Values to change.
   * @returns The changed counterparty.
   * @throws NotFoundException if there is no such counterparty.
   * @throws ConflictException if the tax number is already taken.
   */
  async updateCounterparty(
    id: string,
    counterpartyChanges: UpdateCounterpartyDto,
  ): Promise<CounterpartyDto> {
    try {
      const counterparty = await this.counterparties.update(id, {
        name: counterpartyChanges.name,
        type: counterpartyChanges.type,
        taxId: counterpartyChanges.taxId,
        email: counterpartyChanges.email,
        phone: counterpartyChanges.phone,
        address: counterpartyChanges.address,
        isActive: counterpartyChanges.isActive,
      })
      return CounterpartyDto.fromRecord(counterparty)
    } catch (error) {
      throw this.translateWriteError(error)
    }
  }

  /**
   * Deactivates a counterparty. Repeating it changes nothing.
   *
   * @param id - Identifier of the counterparty.
   * @returns A promise that resolves once the counterparty is inactive.
   * @throws NotFoundException if there is no such counterparty.
   */
  async deactivateCounterparty(id: string): Promise<void> {
    try {
      await this.counterparties.update(id, { isActive: false })
    } catch (error) {
      throw this.translateWriteError(error)
    }
  }

  /**
   * Checks that a counterparty named in a request can be used in a certain role.
   *
   * @param id - Identifier of the counterparty.
   * @param allowedTypes - Types that fit the role.
   * @returns The counterparty.
   * @throws UnprocessableEntityException if it does not exist, is inactive or has another type.
   */
  async assertCounterpartyType(
    id: string,
    allowedTypes: CounterpartyType[],
  ): Promise<Counterparty> {
    const counterparty = await this.counterparties.findById(id)
    if (!counterparty) {
      throw new UnprocessableEntityException('Counterparty not found')
    }
    if (!counterparty.isActive) {
      throw new UnprocessableEntityException('The counterparty is inactive')
    }
    if (!allowedTypes.includes(counterparty.type)) {
      throw new UnprocessableEntityException(
        `The counterparty must be of type ${allowedTypes.join(' or ')}`,
      )
    }
    return counterparty
  }

  /**
   * Builds the error for an unknown identifier.
   *
   * @returns The error.
   */
  private counterpartyNotFound(): NotFoundException {
    return new NotFoundException('Counterparty not found')
  }

  /**
   * Explains a rejected write.
   *
   * @param error - Error of a write to the counterparties table.
   * @returns The error to answer with, or the error itself if it is unexpected.
   */
  private translateWriteError(error: unknown): unknown {
    if (violatesUniqueConstraint(error)) {
      return new ConflictException('A counterparty with this tax number already exists')
    }
    return isMissingRecord(error) ? this.counterpartyNotFound() : error
  }
}

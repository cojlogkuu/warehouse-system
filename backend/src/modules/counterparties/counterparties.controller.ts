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
import { Role } from '../../generated/prisma/enums'
import {
  CounterpartyDto,
  CounterpartyQueryDto,
  CreateCounterpartyDto,
  UpdateCounterpartyDto,
} from './counterparties.dto'
import { CounterpartiesService } from './counterparties.service'

/**
 * REST routes of suppliers and customers. Everyone may read; administrators and managers may
 * write.
 */
@ApiTags('counterparties')
@ApiBearerAuth()
@Controller('counterparties')
export class CounterpartiesController {
  /**
   * Creates the controller.
   *
   * @param counterparties - Application logic of counterparties.
   */
  constructor(private readonly counterparties: CounterpartiesService) {}

  /**
   * Lists counterparties.
   *
   * @param counterpartyQuery - Conditions of the list.
   * @returns The matching counterparties.
   */
  @Get()
  @ApiOkResponse({ type: [CounterpartyDto] })
  listCounterparties(@Query() counterpartyQuery: CounterpartyQueryDto): Promise<CounterpartyDto[]> {
    return this.counterparties.listCounterparties(counterpartyQuery)
  }

  /**
   * Shows one counterparty.
   *
   * @param id - Identifier of the counterparty.
   * @returns The counterparty.
   */
  @Get(':id')
  @ApiOkResponse({ type: CounterpartyDto })
  showCounterparty(@Param('id', ParseUUIDPipe) id: string): Promise<CounterpartyDto> {
    return this.counterparties.findCounterparty(id)
  }

  /**
   * Creates a counterparty.
   *
   * @param newCounterparty - Data of the new counterparty.
   * @returns The created counterparty.
   */
  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiCreatedResponse({ type: CounterpartyDto })
  createCounterparty(@Body() newCounterparty: CreateCounterpartyDto): Promise<CounterpartyDto> {
    return this.counterparties.createCounterparty(newCounterparty)
  }

  /**
   * Changes, deactivates or restores a counterparty.
   *
   * @param id - Identifier of the counterparty.
   * @param counterpartyChanges - Values to change.
   * @returns The changed counterparty.
   */
  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOkResponse({ type: CounterpartyDto })
  updateCounterparty(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() counterpartyChanges: UpdateCounterpartyDto,
  ): Promise<CounterpartyDto> {
    return this.counterparties.updateCounterparty(id, counterpartyChanges)
  }

  /**
   * Deactivates a counterparty.
   *
   * @param id - Identifier of the counterparty.
   * @returns A promise that resolves once the counterparty is inactive.
   */
  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  deactivateCounterparty(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.counterparties.deactivateCounterparty(id)
  }
}

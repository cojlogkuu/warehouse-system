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
import { CreateUnitDto, UpdateUnitDto, UnitDto } from './units.dto'
import { UnitsService } from './units.service'

/**
 * REST routes of units of measure. Everyone may read; only administrators
 * may write.
 */
@ApiTags('units')
@ApiBearerAuth()
@Controller('units')
export class UnitsController {
  /**
   * Creates the controller.
   *
   * @param units - Application logic of units.
   */
  constructor(private readonly units: UnitsService) {}

  /**
   * Lists units.
   *
   * @returns All units.
   */
  @Get()
  @ApiOkResponse({ type: [UnitDto] })
  listUnits(): Promise<UnitDto[]> {
    return this.units.listUnits()
  }

  /**
   * Shows one unit.
   *
   * @param id - Identifier of the unit.
   * @returns The unit.
   */
  @Get(':id')
  @ApiOkResponse({ type: UnitDto })
  showUnit(@Param('id', ParseUUIDPipe) id: string): Promise<UnitDto> {
    return this.units.findUnit(id)
  }

  /**
   * Creates a unit.
   *
   * @param newUnit - Data of the new unit.
   * @returns The created unit.
   */
  @Post()
  @Roles(Role.ADMIN)
  @ApiCreatedResponse({ type: UnitDto })
  createUnit(@Body() newUnit: CreateUnitDto): Promise<UnitDto> {
    return this.units.createUnit(newUnit)
  }

  /**
   * Changes a unit.
   *
   * @param id - Identifier of the unit.
   * @param unitChanges - Values to change.
   * @returns The changed unit.
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOkResponse({ type: UnitDto })
  updateUnit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() unitChanges: UpdateUnitDto,
  ): Promise<UnitDto> {
    return this.units.updateUnit(id, unitChanges)
  }

  /**
   * Deletes an unused unit.
   *
   * @param id - Identifier of the unit.
   * @returns A promise that resolves once the unit is deleted.
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  deleteUnit(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.units.deleteUnit(id)
  }
}

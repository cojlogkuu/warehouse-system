import {
  Body,
  Controller,
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
import { CreateUserDto, ResetPasswordDto, UpdateUserDto, UserDto, UserQueryDto } from './users.dto'
import { UsersService } from './users.service'

/**
 * REST routes of user administration, for administrators only.
 */
@ApiTags('users')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  /**
   * Creates the controller.
   *
   * @param users - User administration.
   */
  constructor(private readonly users: UsersService) {}

  /**
   * Lists users.
   *
   * @param query - Conditions of the list.
   * @returns The matching users.
   */
  @Get()
  @ApiOkResponse({ type: [UserDto] })
  findAll(@Query() query: UserQueryDto): Promise<UserDto[]> {
    return this.users.findAll(query)
  }

  /**
   * Creates a user.
   *
   * @param dto - Data of the new user.
   * @returns The created user.
   */
  @Post()
  @ApiCreatedResponse({ type: UserDto })
  create(@Body() dto: CreateUserDto): Promise<UserDto> {
    return this.users.create(dto)
  }

  /**
   * Shows one user.
   *
   * @param id - Identifier of the user.
   * @returns The user.
   */
  @Get(':id')
  @ApiOkResponse({ type: UserDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserDto> {
    return this.users.findOne(id)
  }

  /**
   * Changes, deactivates or restores a user.
   *
   * @param id - Identifier of the user.
   * @param dto - Values to change.
   * @returns The changed user.
   */
  @Patch(':id')
  @ApiOkResponse({ type: UserDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto): Promise<UserDto> {
    return this.users.update(id, dto)
  }

  /**
   * Resets the password of a user.
   *
   * @param id - Identifier of the user.
   * @param dto - The new password.
   * @returns A promise that resolves once the password is set.
   */
  @Patch(':id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<void> {
    return this.users.resetPassword(id, dto)
  }
}

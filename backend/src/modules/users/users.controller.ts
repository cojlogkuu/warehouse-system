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
   * @param userQuery - Conditions of the list.
   * @returns The matching users.
   */
  @Get()
  @ApiOkResponse({ type: [UserDto] })
  listUsers(@Query() userQuery: UserQueryDto): Promise<UserDto[]> {
    return this.users.listUsers(userQuery)
  }

  /**
   * Creates a user.
   *
   * @param newUser - Data of the new user.
   * @returns The created user.
   */
  @Post()
  @ApiCreatedResponse({ type: UserDto })
  createUser(@Body() newUser: CreateUserDto): Promise<UserDto> {
    return this.users.createUser(newUser)
  }

  /**
   * Shows one user.
   *
   * @param id - Identifier of the user.
   * @returns The user.
   */
  @Get(':id')
  @ApiOkResponse({ type: UserDto })
  showUser(@Param('id', ParseUUIDPipe) id: string): Promise<UserDto> {
    return this.users.findPublicUser(id)
  }

  /**
   * Changes, deactivates or restores a user.
   *
   * @param id - Identifier of the user.
   * @param userChanges - Values to change.
   * @returns The changed user.
   */
  @Patch(':id')
  @ApiOkResponse({ type: UserDto })
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() userChanges: UpdateUserDto,
  ): Promise<UserDto> {
    return this.users.updateUser(id, userChanges)
  }

  /**
   * Resets the password of a user.
   *
   * @param id - Identifier of the user.
   * @param newPassword - The new password.
   * @returns A promise that resolves once the password is set.
   */
  @Patch(':id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  resetUserPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() newPassword: ResetPasswordDto,
  ): Promise<void> {
    return this.users.resetPassword(id, newPassword)
  }
}

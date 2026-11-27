import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator'
import { IsBooleanQuery } from '../../common/validators'
import { IsEmailAddress } from '../../common/validators/email-address.decorator'
import { IsNewPassword } from '../../common/validators/password.decorator'
import type { User } from '../../generated/prisma/client'
import { Role } from '../../generated/prisma/enums'

const MAX_NAME_LENGTH = 200
const MAX_SEARCH_LENGTH = 200

/**
 * Data of a new user.
 */
export class CreateUserDto {
  /** E-mail address (login). */
  @IsEmailAddress()
  email: string

  /** Initial password. */
  @IsNewPassword()
  password: string

  /** Full name. */
  @ApiProperty({ maxLength: MAX_NAME_LENGTH })
  @Transform(({ value: rawName }: { value: unknown }) =>
    typeof rawName === 'string' ? rawName.trim() : rawName,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_NAME_LENGTH)
  fullName: string

  /** Role of the user. */
  @ApiProperty({ enum: Role, enumName: 'Role' })
  @IsEnum(Role)
  role: Role
}

/**
 * Values of a user to change; omitted values stay, `null` is rejected. The password has its own
 * route.
 */
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const), {
  skipNullProperties: false,
}) {
  /** `false` deactivates the account, `true` restores it. */
  @ApiPropertyOptional()
  @ValidateIf((_target, fieldValue) => fieldValue !== undefined)
  @IsBoolean()
  isActive?: boolean
}

/**
 * New password that an administrator sets for a user.
 */
export class ResetPasswordDto {
  /** The new password. */
  @IsNewPassword()
  password: string
}

/**
 * Query parameters of the user list.
 */
export class UserQueryDto {
  /** Part of the e-mail address or of the full name. */
  @ApiPropertyOptional({ maxLength: MAX_SEARCH_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_SEARCH_LENGTH)
  search?: string

  /** Only users with this role. */
  @ApiPropertyOptional({ enum: Role, enumName: 'Role' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role

  /** Only active or only deactivated users. */
  @IsBooleanQuery()
  isActive?: boolean
}

/**
 * Public data of a user. Every field is listed explicitly, so the password hash cannot leak.
 */
export class UserDto {
  /** Identifier. */
  @ApiProperty({ format: 'uuid' })
  id: string

  /** E-mail address (login). */
  @ApiProperty()
  email: string

  /** Full name. */
  @ApiProperty()
  fullName: string

  /** Role. */
  @ApiProperty({ enum: Role, enumName: 'Role' })
  role: Role

  /** Whether the user may log in. */
  @ApiProperty()
  isActive: boolean

  /** Creation time. */
  @ApiProperty()
  createdAt: Date

  /** Time of the last change. */
  @ApiProperty()
  updatedAt: Date

  /**
   * Maps a stored user to its public data.
   *
   * @param user - Stored user.
   * @returns The public data of that user.
   */
  static fromRecord(user: User): UserDto {
    return Object.assign(new UserDto(), {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
  }
}

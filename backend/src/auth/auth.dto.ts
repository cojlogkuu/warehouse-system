import { ApiProperty } from '@nestjs/swagger'
import type { AuthenticatedUser } from '../common/types'
import { IsEmailAddress } from '../common/validators/email-address.decorator'
import { IsExistingPassword, IsNewPassword } from '../common/validators/password.decorator'
import { Role } from '../generated/prisma/enums'

/**
 * Credentials of a login.
 */
export class LoginDto {
  /** E-mail address. */
  @IsEmailAddress()
  email: string

  /** Password. */
  @IsExistingPassword()
  password: string
}

/**
 * Data with which users replace their own password.
 */
export class ChangePasswordDto {
  /** The password in use. */
  @IsExistingPassword()
  currentPassword: string

  /** The password to set. */
  @IsNewPassword()
  newPassword: string
}

/**
 * Tokens of a session as the service returns them. It is not a response body: the refresh token
 * leaves the server only in its cookie.
 */
export class AuthTokensDto {
  /** Token that authorizes requests. */
  accessToken: string

  /** Lifetime of the access token in seconds. */
  expiresIn: number

  /** Token that obtains the next pair of tokens. */
  refreshToken: string
}

/**
 * Response of login and refresh.
 */
export class AccessTokenDto {
  /** Token to send as `Authorization: Bearer`. */
  @ApiProperty()
  accessToken: string

  /** Lifetime of the access token in seconds. */
  @ApiProperty()
  expiresIn: number
}

/**
 * Own profile of the authenticated user.
 */
export class ProfileDto implements AuthenticatedUser {
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
}

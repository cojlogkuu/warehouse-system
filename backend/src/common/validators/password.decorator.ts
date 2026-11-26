import { applyDecorators } from '@nestjs/common'
import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, MinLength } from 'class-validator'
import { MAX_PASSWORD_BYTES, MIN_PASSWORD_LENGTH } from '../constants'
import { MaxByteLength } from './max-byte-length.decorator'

/**
 * Validates and documents a password that is about to be set.
 *
 * @returns The property decorator.
 */
export function IsNewPassword(): PropertyDecorator {
  return applyDecorators(
    ApiProperty({
      format: 'password',
      minLength: MIN_PASSWORD_LENGTH,
      description: `At most ${MAX_PASSWORD_BYTES.toString()} bytes`,
    }),
    IsString(),
    MinLength(MIN_PASSWORD_LENGTH),
    MaxByteLength(MAX_PASSWORD_BYTES),
  )
}

/**
 * Validates and documents a password that is only compared with the stored one. The size is
 * limited because bcrypt would otherwise accept any longer text with the same beginning.
 *
 * @returns The property decorator.
 */
export function IsExistingPassword(): PropertyDecorator {
  return applyDecorators(
    ApiProperty({ format: 'password' }),
    IsString(),
    IsNotEmpty(),
    MaxByteLength(MAX_PASSWORD_BYTES),
  )
}

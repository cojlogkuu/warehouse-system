import { applyDecorators } from '@nestjs/common'
import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsAscii, IsEmail, MaxLength } from 'class-validator'

/** Longest accepted e-mail address. */
export const MAX_EMAIL_LENGTH = 254

/**
 * Brings an e-mail address into the form in which it is stored and compared.
 *
 * @param email - Address as typed by the user.
 * @returns The address without surrounding spaces, in lower case.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Normalizes, validates and documents an e-mail address. Only ASCII is accepted, so the
 * lower-casing here and the lower-case rule of the database always agree.
 *
 * @returns The property decorator.
 */
export function IsEmailAddress(): PropertyDecorator {
  return applyDecorators(
    ApiProperty({ format: 'email', maxLength: MAX_EMAIL_LENGTH }),
    Transform(({ value: rawEmail }: { value: unknown }) =>
      typeof rawEmail === 'string' ? normalizeEmail(rawEmail) : rawEmail,
    ),
    IsAscii(),
    IsEmail(),
    MaxLength(MAX_EMAIL_LENGTH),
  )
}

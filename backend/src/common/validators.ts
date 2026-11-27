import { applyDecorators } from '@nestjs/common'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform, type TransformFnParams } from 'class-transformer'
import {
  IsAscii,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  NotContains,
  ValidateIf,
} from 'class-validator'
import type { Prisma } from '../generated/prisma/client'
import { MAX_EMAIL_LENGTH, normalizeEmail } from './validators/email-address.decorator'

const MAX_SEARCH_LENGTH = 200

/** Character that PostgreSQL cannot store in a text value. */
const NULL_CHARACTER = '\u0000'

/** Decimal places of an amount of money, as in the database columns. */
const MONEY_SCALE = 2

/** Decimal places of a quantity, as in the database columns. */
const QUANTITY_SCALE = 3

/** A non-negative amount that fits `numeric(14,2)`. */
const MONEY_PATTERN = /^\d{1,12}(\.\d{1,2})?$/

/** A non-negative quantity that fits `numeric(14,3)`. */
const QUANTITY_PATTERN = /^\d{1,11}(\.\d{1,3})?$/

/** Settings of a decimal property. */
export interface DecimalPropertyOptions {
  /** Whether the property may be omitted; `null` is rejected either way. */
  optional?: boolean
}

/**
 * Removes the spaces around a text; anything else is left for the validators to reject.
 *
 * @param params - Data of the transformation.
 * @returns The trimmed text, or the value unchanged if it is not a text.
 */
function trimText({ value: rawInput }: TransformFnParams): unknown {
  const rawValue: unknown = rawInput
  return typeof rawValue === 'string' ? rawValue.trim() : rawValue
}

/**
 * Normalizes, validates and documents a text that must not be empty.
 *
 * @param maxLength - Largest accepted number of characters.
 * @returns The property decorator.
 */
export function IsRequiredText(maxLength: number): PropertyDecorator {
  return applyDecorators(
    ApiProperty({ maxLength }),
    Transform(trimText),
    IsString(),
    IsNotEmpty(),
    MaxLength(maxLength),
    NotContains(NULL_CHARACTER),
  )
}

/**
 * Normalizes, validates and documents a text that may be absent. An empty text becomes `null`.
 *
 * @param maxLength - Largest accepted number of characters.
 * @returns The property decorator.
 */
export function IsOptionalText(maxLength: number): PropertyDecorator {
  return applyDecorators(
    ApiPropertyOptional({ type: String, nullable: true, maxLength }),
    Transform((transformParams) => {
      const trimmedText = trimText(transformParams)
      return trimmedText === '' ? null : trimmedText
    }),
    IsOptional(),
    IsString(),
    MaxLength(maxLength),
    NotContains(NULL_CHARACTER),
  )
}

/**
 * The variant of `IsEmailAddress` for an address that may be absent. An empty text becomes `null`.
 *
 * @returns The property decorator.
 */
export function IsOptionalEmail(): PropertyDecorator {
  return applyDecorators(
    ApiPropertyOptional({
      type: String,
      format: 'email',
      nullable: true,
      maxLength: MAX_EMAIL_LENGTH,
    }),
    Transform(({ value: rawEmail }: { value: unknown }) =>
      typeof rawEmail === 'string' ? normalizeEmail(rawEmail) || null : rawEmail,
    ),
    IsOptional(),
    IsAscii(),
    IsEmail(),
    MaxLength(MAX_EMAIL_LENGTH),
  )
}

/**
 * Validates and documents an optional search term of a list.
 *
 * @returns The property decorator.
 */
export function IsSearchTerm(): PropertyDecorator {
  return applyDecorators(
    ApiPropertyOptional({ maxLength: MAX_SEARCH_LENGTH }),
    IsOptional(),
    IsString(),
    MaxLength(MAX_SEARCH_LENGTH),
    NotContains(NULL_CHARACTER),
  )
}

/**
 * Converts, validates and documents an optional `true` or `false` query parameter.
 *
 * @returns The property decorator.
 */
export function IsBooleanQuery(): PropertyDecorator {
  return applyDecorators(
    ApiPropertyOptional(),
    IsOptional(),
    Transform(({ value: rawFlag }: { value: unknown }) =>
      rawFlag === 'true' ? true : rawFlag === 'false' ? false : rawFlag,
    ),
    IsBoolean(),
  )
}

/**
 * Validates and documents an amount of money sent as a decimal string.
 *
 * @param decimalOptions - Settings of the property.
 * @returns The property decorator.
 */
export function IsMoney(decimalOptions: DecimalPropertyOptions = {}): PropertyDecorator {
  return isDecimalString(MONEY_PATTERN, MONEY_SCALE, '12.50', decimalOptions)
}

/**
 * Validates and documents a quantity sent as a decimal string.
 *
 * @param decimalOptions - Settings of the property.
 * @returns The property decorator.
 */
export function IsQuantity(decimalOptions: DecimalPropertyOptions = {}): PropertyDecorator {
  return isDecimalString(QUANTITY_PATTERN, QUANTITY_SCALE, '3.000', decimalOptions)
}

/**
 * Formats an amount of money for a response.
 *
 * @param amount - Stored amount.
 * @returns The amount with exactly two decimal places.
 */
export function toMoney(amount: Prisma.Decimal): string {
  return amount.toFixed(MONEY_SCALE)
}

/**
 * Formats a quantity for a response.
 *
 * @param quantity - Stored quantity.
 * @returns The quantity with exactly three decimal places.
 */
export function toQuantity(quantity: Prisma.Decimal): string {
  return quantity.toFixed(QUANTITY_SCALE)
}

/**
 * Validates and documents a non-negative decimal string.
 *
 * @param pattern - Accepted form of the string.
 * @param scale - Largest number of decimal places, named in the error message.
 * @param exampleText - Example shown in the API documentation.
 * @param options - Settings of the property.
 * @returns The property decorator.
 */
function isDecimalString(
  pattern: RegExp,
  scale: number,
  exampleText: string,
  { optional = false }: DecimalPropertyOptions,
): PropertyDecorator {
  const propertyDecorators = [
    ApiProperty({
      type: String,
      pattern: pattern.source,
      example: exampleText,
      required: !optional,
    }),
    IsString(),
    Matches(pattern, {
      message: `$property must be a non-negative decimal string with at most ${scale.toString()} decimal places`,
    }),
  ]
  if (optional) {
    propertyDecorators.push(ValidateIf((_target, fieldValue) => fieldValue !== undefined))
  }
  return applyDecorators(...propertyDecorators)
}

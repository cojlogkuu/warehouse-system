import { Transform, Type, plainToInstance } from 'class-transformer'
import {
  IsBoolean,
  IsInt,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  ValidateBy,
  validateSync,
} from 'class-validator'

const MAX_PORT = 65535
/** HS256 keys shorter than the 256 bits of the hash weaken the signature. */
const MIN_SECRET_LENGTH = 32
/** Lifetime of an access token in seconds: 15 minutes. */
const DEFAULT_ACCESS_TTL = 15 * 60
/** Lifetime of a refresh token in seconds: 7 days. */
const DEFAULT_REFRESH_TTL = 7 * 24 * 60 * 60
const MAX_TTL_SECONDS = 365 * 24 * 60 * 60

/**
 * Requires a variable to differ from another one.
 *
 * @param otherProperty - Name of the variable to compare with.
 * @returns The property decorator.
 */
function DiffersFrom(otherProperty: keyof EnvironmentVariables): PropertyDecorator {
  return ValidateBy({
    name: 'differsFrom',
    validator: {
      validate: (secret, validation) =>
        secret !== (validation?.object as EnvironmentVariables)[otherProperty],
      defaultMessage: () => `$property must differ from ${otherProperty}`,
    },
  })
}

/**
 * Environment variables used by the application, validated once at startup.
 */
export class EnvironmentVariables {
  /** HTTP port the API listens on. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PORT)
  PORT = 3000

  /** Origin allowed by CORS. */
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  CORS_ORIGIN = 'http://localhost:5173'

  /** Connection string of the PostgreSQL database; has no default. */
  @IsUrl(
    { protocols: ['postgresql', 'postgres'], require_protocol: true, require_tld: false },
    { message: '$property is required and must be a postgresql:// connection string' },
  )
  DATABASE_URL: string

  /** Secret that signs the access tokens; has no default. */
  @IsString()
  @MinLength(MIN_SECRET_LENGTH)
  JWT_ACCESS_SECRET: string

  /** Secret that signs the refresh tokens; has no default. */
  @IsString()
  @MinLength(MIN_SECRET_LENGTH)
  @DiffersFrom('JWT_ACCESS_SECRET')
  JWT_REFRESH_SECRET: string

  /** Lifetime of an access token in seconds. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_TTL_SECONDS)
  JWT_ACCESS_TTL_SECONDS = DEFAULT_ACCESS_TTL

  /** Lifetime of a refresh token (and of its cookie) in seconds. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_TTL_SECONDS)
  JWT_REFRESH_TTL_SECONDS = DEFAULT_REFRESH_TTL

  /** Whether the refresh cookie is sent over HTTPS only; disable for local development. */
  @Transform(({ value: rawFlag }: { value: unknown }) =>
    rawFlag === 'true' ? true : rawFlag === 'false' ? false : rawFlag,
  )
  @IsBoolean({ message: '$property must be true or false' })
  COOKIE_SECURE = true
}

/**
 * Validates the raw environment; used as the `validate` hook of the ConfigModule.
 * The error lists the variable names and the broken rules but never their values.
 *
 * @param rawEnvironment - Variables from the `.env` file and the process environment.
 * @returns The typed variables with defaults applied.
 * @throws Error if a required variable is missing or a variable is invalid.
 */
export function validateEnvironment(rawEnvironment: Record<string, unknown>): EnvironmentVariables {
  const validatedVariables = plainToInstance(EnvironmentVariables, rawEnvironment, {
    exposeDefaultValues: true,
  })
  const validationErrors = validateSync(validatedVariables, {
    validationError: { target: false, value: false },
  })
  if (validationErrors.length > 0) {
    const failedRules = validationErrors.flatMap((validationError) =>
      Object.values(validationError.constraints ?? {}),
    )
    throw new Error(`Invalid environment configuration: ${failedRules.join('; ')}`)
  }
  return validatedVariables
}

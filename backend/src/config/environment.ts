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
const DEFAULT_ACCESS_TTL_SECONDS = 15 * 60
const DEFAULT_REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60
const MAX_TTL_SECONDS = 365 * 24 * 60 * 60

/**
 * Requires a variable to differ from another one.
 *
 * @param other - Name of the variable to compare with.
 * @returns The property decorator.
 */
function DiffersFrom(other: keyof EnvironmentVariables): PropertyDecorator {
  return ValidateBy({
    name: 'differsFrom',
    validator: {
      validate: (value, args) => value !== (args?.object as EnvironmentVariables)[other],
      defaultMessage: () => `$property must differ from ${other}`,
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
  JWT_ACCESS_TTL_SECONDS = DEFAULT_ACCESS_TTL_SECONDS

  /** Lifetime of a refresh token (and of its cookie) in seconds. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_TTL_SECONDS)
  JWT_REFRESH_TTL_SECONDS = DEFAULT_REFRESH_TTL_SECONDS

  /** Whether the refresh cookie is sent over HTTPS only; disable for local development. */
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: '$property must be true or false' })
  COOKIE_SECURE = true
}

/**
 * Validates the raw environment; used as the `validate` hook of the ConfigModule.
 * The error lists the variable names and the broken rules but never their values.
 *
 * @param raw - Variables from the `.env` file and the process environment.
 * @returns The typed variables with defaults applied.
 * @throws Error if a required variable is missing or a variable is invalid.
 */
export function validateEnvironment(raw: Record<string, unknown>): EnvironmentVariables {
  const variables = plainToInstance(EnvironmentVariables, raw, { exposeDefaultValues: true })
  const errors = validateSync(variables, { validationError: { target: false, value: false } })
  if (errors.length > 0) {
    const rules = errors.flatMap((error) => Object.values(error.constraints ?? {}))
    throw new Error(`Invalid environment configuration: ${rules.join('; ')}`)
  }
  return variables
}

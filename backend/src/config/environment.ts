import { plainToInstance, Type } from 'class-transformer'
import { IsInt, IsUrl, Max, Min, validateSync } from 'class-validator'

const MAX_PORT = 65535

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

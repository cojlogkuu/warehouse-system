import { PrismaPg } from '@prisma/adapter-pg'
import { hash } from 'bcrypt'
import { plainToInstance } from 'class-transformer'
import { IsEmail, IsNotEmpty, IsString, IsUrl, MinLength, validateSync } from 'class-validator'
import { Prisma, PrismaClient, Role } from '../src/generated/prisma/client'

const BCRYPT_COST = 12
const MIN_PASSWORD_LENGTH = 12
/** bcrypt ignores everything after this number of bytes. */
const MAX_PASSWORD_BYTES = 72
const SETTINGS_ID = 1

/**
 * Environment variables of the seed.
 */
class SeedVariables {
  /** Connection string of the database. */
  @IsUrl(
    { protocols: ['postgresql', 'postgres'], require_protocol: true, require_tld: false },
    { message: '$property is required and must be a postgresql:// connection string' },
  )
  DATABASE_URL: string

  /** E-mail address (login) of the first administrator. */
  @IsEmail()
  SEED_ADMIN_EMAIL: string

  /** Password of the first administrator. */
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  SEED_ADMIN_PASSWORD: string

  /** Full name of the first administrator. */
  @IsString()
  @IsNotEmpty()
  SEED_ADMIN_FULL_NAME: string
}

/**
 * Reads and validates the seed variables. The error never contains their values.
 *
 * @returns The validated variables.
 * @throws Error if a variable is missing or invalid.
 */
function readSeedVariables(): SeedVariables {
  const variables = plainToInstance(SeedVariables, process.env)
  const errors = validateSync(variables, { validationError: { target: false, value: false } })
  const rules = errors.flatMap((error) => Object.values(error.constraints ?? {}))
  if (
    errors.length === 0 &&
    Buffer.byteLength(variables.SEED_ADMIN_PASSWORD) > MAX_PASSWORD_BYTES
  ) {
    rules.push(`SEED_ADMIN_PASSWORD must be at most ${MAX_PASSWORD_BYTES.toString()} bytes long`)
  }
  if (rules.length > 0) {
    throw new Error(`Invalid seed configuration: ${rules.join('; ')}`)
  }
  return variables
}

/**
 * Creates the first administrator unless an active administrator already exists.
 *
 * @param transaction - Client of the surrounding transaction.
 * @param variables - Validated seed variables.
 * @returns `true` if the administrator was created.
 * @throws Error if the e-mail address belongs to another account.
 */
async function seedAdministrator(
  transaction: Prisma.TransactionClient,
  variables: SeedVariables,
): Promise<boolean> {
  const activeAdministrators = await transaction.user.count({
    where: { role: Role.ADMIN, isActive: true },
  })
  if (activeAdministrators > 0) {
    return false
  }
  const email = variables.SEED_ADMIN_EMAIL.toLowerCase()
  if ((await transaction.user.count({ where: { email } })) > 0) {
    throw new Error('SEED_ADMIN_EMAIL belongs to an account that is not an active administrator')
  }
  await transaction.user.create({
    data: {
      email,
      passwordHash: await hash(variables.SEED_ADMIN_PASSWORD, BCRYPT_COST),
      fullName: variables.SEED_ADMIN_FULL_NAME,
      role: Role.ADMIN,
    },
  })
  return true
}

/**
 * Creates the single settings row with defaults unless it already exists.
 *
 * @param transaction - Client of the surrounding transaction.
 * @returns `true` if the row was created.
 */
async function seedSystemSettings(transaction: Prisma.TransactionClient): Promise<boolean> {
  const { count } = await transaction.systemSettings.createMany({
    data: [{ id: SETTINGS_ID, companyName: 'My Company', companyAddress: 'Company address' }],
    skipDuplicates: true,
  })
  return count > 0
}

/**
 * Prints what happened to a seeded record, without any of its data.
 *
 * @param record - Name of the record.
 * @param created - Whether the record was created by this run.
 */
function report(record: string, created: boolean): void {
  console.log(`${record}: ${created ? 'created' : 'already present'}`)
}

/**
 * Seeds the data that cannot be created through the application, in one transaction.
 *
 * @returns A promise that resolves once the seed has finished.
 * @throws Error if the configuration is invalid or the database rejects the data.
 */
async function seed(): Promise<void> {
  const variables = readSeedVariables()
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: variables.DATABASE_URL }),
  })
  try {
    const [administrator, settings] = await prisma.$transaction(async (transaction) => [
      await seedAdministrator(transaction, variables),
      await seedSystemSettings(transaction),
    ])
    report('Administrator', administrator)
    report('System settings', settings)
  } finally {
    await prisma.$disconnect()
  }
}

seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Seeding failed')
  process.exitCode = 1
})

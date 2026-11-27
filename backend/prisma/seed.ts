import { PrismaPg } from '@prisma/adapter-pg'
import { hash } from 'bcrypt'
import { plainToInstance } from 'class-transformer'
import { IsEmail, IsNotEmpty, IsString, IsUrl, MinLength, validateSync } from 'class-validator'
import { BCRYPT_COST, MAX_PASSWORD_BYTES, MIN_PASSWORD_LENGTH } from '../src/common/constants'
import { Prisma, PrismaClient, Role } from '../src/generated/prisma/client'

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
  const seedVariables = plainToInstance(SeedVariables, process.env)
  const validationErrors = validateSync(seedVariables, {
    validationError: { target: false, value: false },
  })
  const failedRules = validationErrors.flatMap((validationError) =>
    Object.values(validationError.constraints ?? {}),
  )
  if (
    validationErrors.length === 0 &&
    Buffer.byteLength(seedVariables.SEED_ADMIN_PASSWORD) > MAX_PASSWORD_BYTES
  ) {
    failedRules.push(
      `SEED_ADMIN_PASSWORD must be at most ${MAX_PASSWORD_BYTES.toString()} bytes long`,
    )
  }
  if (failedRules.length > 0) {
    throw new Error(`Invalid seed configuration: ${failedRules.join('; ')}`)
  }
  return seedVariables
}

/**
 * Creates the first administrator unless an active administrator already exists.
 *
 * @param transaction - Client of the surrounding transaction.
 * @param seedVariables - Validated seed variables.
 * @returns `true` if the administrator was created.
 * @throws Error if the e-mail address belongs to another account.
 */
async function seedAdministrator(
  transaction: Prisma.TransactionClient,
  seedVariables: SeedVariables,
): Promise<boolean> {
  const activeAdministrators = await transaction.user.count({
    where: { role: Role.ADMIN, isActive: true },
  })
  if (activeAdministrators > 0) {
    return false
  }
  const adminEmail = seedVariables.SEED_ADMIN_EMAIL.toLowerCase()
  if ((await transaction.user.count({ where: { email: adminEmail } })) > 0) {
    throw new Error('SEED_ADMIN_EMAIL belongs to an account that is not an active administrator')
  }
  await transaction.user.create({
    data: {
      email: adminEmail,
      passwordHash: await hash(seedVariables.SEED_ADMIN_PASSWORD, BCRYPT_COST),
      fullName: seedVariables.SEED_ADMIN_FULL_NAME,
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
 * @param recordName - Name of the record.
 * @param wasCreated - Whether the record was created by this run.
 */
function logSeedOutcome(recordName: string, wasCreated: boolean): void {
  console.log(`${recordName}: ${wasCreated ? 'created' : 'already present'}`)
}

/**
 * Seeds the data that cannot be created through the application, in one transaction.
 *
 * @returns A promise that resolves once the seed has finished.
 * @throws Error if the configuration is invalid or the database rejects the data.
 */
async function runSeed(): Promise<void> {
  const seedVariables = readSeedVariables()
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: seedVariables.DATABASE_URL }),
  })
  try {
    const [adminCreated, settingsCreated] = await prisma.$transaction(async (transaction) => [
      await seedAdministrator(transaction, seedVariables),
      await seedSystemSettings(transaction),
    ])
    logSeedOutcome('Administrator', adminCreated)
    logSeedOutcome('System settings', settingsCreated)
  } finally {
    await prisma.$disconnect()
  }
}

runSeed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Seeding failed')
  process.exitCode = 1
})

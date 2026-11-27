import { Prisma } from '../generated/prisma/client'

/** Error code of Prisma for a violated unique constraint. */
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002'

/** Error code of Prisma for a violated foreign key, on a write as well as on a delete. */
const FOREIGN_KEY_VIOLATION = 'P2003'

/** Error code of Prisma for a write to a record that does not exist. */
const RECORD_NOT_FOUND = 'P2025'

/**
 * Tells whether the database rejected a write because a unique value already exists.
 *
 * @param error - Anything thrown by a database call.
 * @returns `true` for a violated unique constraint.
 */
export function violatesUniqueConstraint(error: unknown): boolean {
  return hasErrorCode(error, UNIQUE_CONSTRAINT_VIOLATION)
}

/**
 * Tells whether the database rejected a write or a delete because of a foreign key.
 *
 * @param error - Anything thrown by a database call.
 * @returns `true` for a violated foreign key.
 */
export function violatesForeignKey(error: unknown): boolean {
  return hasErrorCode(error, FOREIGN_KEY_VIOLATION)
}

/**
 * Tells whether an update or a delete found no record to change.
 *
 * @param error - Anything thrown by a database call.
 * @returns `true` for a missing record.
 */
export function isMissingRecord(error: unknown): boolean {
  return hasErrorCode(error, RECORD_NOT_FOUND)
}

/**
 * Reads the name of the database constraint behind a rejected write. The PostgreSQL driver
 * adapter reports it deep inside the untyped metadata of the error.
 *
 * @param error - Anything thrown by a database call.
 * @returns The name of the constraint, or `undefined` if the error does not name one.
 */
export function violatedConstraint(error: unknown): string | undefined {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return undefined
  }
  const metadataPath = ['driverAdapterError', 'cause', 'constraint', 'index']
  const constraintName = metadataPath.reduce<unknown>(readProperty, error.meta)
  return typeof constraintName === 'string' ? constraintName : undefined
}

/**
 * Tells whether an error is a known database error with the given code.
 *
 * @param error - Anything thrown by a database call.
 * @param errorCode - Error code of Prisma.
 * @returns `true` if the codes match.
 */
function hasErrorCode(error: unknown, errorCode: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === errorCode
}

/**
 * Reads a property of a value of unknown shape.
 *
 * @param container - Anything.
 * @param propertyName - Name of the property.
 * @returns The property, or `undefined` if the value is not an object.
 */
function readProperty(container: unknown, propertyName: string): unknown {
  return typeof container === 'object' && container !== null
    ? (container as Record<string, unknown>)[propertyName]
    : undefined
}

/**
 * Escapes the wildcards of `LIKE`. Prisma passes them through in `contains`, so without this a
 * search term such as `%` would match everything.
 *
 * @param term - Text the user searches for.
 * @returns The term, to be matched literally.
 */
export function escapeLikePattern(term: string): string {
  return term.replace(/[\\%_]/g, '\\$&')
}

import { Prisma } from '../generated/prisma/client'

/** Error code of Prisma for a violated unique constraint. */
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002'

/**
 * Tells whether the database rejected a write because a unique value already exists.
 *
 * @param error - Anything thrown by a database call.
 * @returns `true` for a violated unique constraint.
 */
export function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === UNIQUE_CONSTRAINT_VIOLATION
  )
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

import type { Request } from 'express'
import type { Role } from '../generated/prisma/enums'

/**
 * The user behind a request, as loaded from the database when the access token was checked.
 */
export interface AuthenticatedUser {
  /** Identifier of the user. */
  id: string
  /** E-mail address (login). */
  email: string
  /** Full name. */
  fullName: string
  /** Current role. */
  role: Role
}

/**
 * HTTP request to which the authentication may have attached the user. Public routes have none.
 */
export type AuthenticatedRequest = Request & { user?: AuthenticatedUser }

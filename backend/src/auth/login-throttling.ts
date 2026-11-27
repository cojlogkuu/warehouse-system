import { type ThrottlerOptions, minutes } from '@nestjs/throttler'
import type { AuthenticatedRequest } from '../common/types'
import { normalizeEmail } from '../common/validators/email-address.decorator'

const ATTEMPT_WINDOW = minutes(1)
const ATTEMPTS_PER_ACCOUNT = 5
const ATTEMPTS_PER_ADDRESS = 30

/**
 * Identifies who guesses a password: the client address together with the account, taken from
 * the authenticated user or from the e-mail address of a login attempt.
 *
 * @param request - Request that checks a password; its body is not validated yet.
 * @returns The key under which attempts are counted.
 */
function trackAccount(request: Record<string, unknown>): string {
  const passwordRequest = request as unknown as AuthenticatedRequest
  const email = (passwordRequest.body as { email?: unknown } | undefined)?.email
  const accountKey =
    passwordRequest.user?.id ?? (typeof email === 'string' ? normalizeEmail(email) : '')
  return `${passwordRequest.ip ?? ''} ${accountKey}`
}

/**
 * Limits on the routes that check a password. The counters live in memory. Nothing is locked
 * permanently, so nobody can shut another person out of an account.
 */
export const PASSWORD_ATTEMPT_LIMITS: ThrottlerOptions[] = [
  { name: 'default', ttl: ATTEMPT_WINDOW, limit: ATTEMPTS_PER_ACCOUNT, getTracker: trackAccount },
  // Without a tracker the client address alone is counted
  { name: 'address', ttl: ATTEMPT_WINDOW, limit: ATTEMPTS_PER_ADDRESS },
]

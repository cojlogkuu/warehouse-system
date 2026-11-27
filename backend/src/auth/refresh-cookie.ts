import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { CookieOptions, Request, Response } from 'express'
import { API_PREFIX, REFRESH_COOKIE_NAME } from '../common/constants'
import type { EnvironmentVariables } from '../config/environment'

/** Path the refresh cookie is restricted to: the authentication routes. */
const REFRESH_COOKIE_PATH = `/${API_PREFIX}/auth`

/**
 * The cookie of the refresh token: hidden from scripts, sent only to the authentication routes
 * and never with requests coming from another site.
 */
@Injectable()
export class RefreshCookie {
  private readonly cookieOptions: CookieOptions
  private readonly maxAge: number

  /**
   * Builds the cookie settings from the configuration.
   *
   * @param config - Cookie settings.
   */
  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.cookieOptions = {
      httpOnly: true,
      sameSite: 'strict',
      secure: config.get('COOKIE_SECURE', { infer: true }),
      path: REFRESH_COOKIE_PATH,
    }
    this.maxAge = config.get('JWT_REFRESH_TTL_SECONDS', { infer: true }) * 1000
  }

  /**
   * Reads the refresh token of a request.
   *
   * @param request - Request with parsed cookies.
   * @returns The refresh token, or `undefined` if the request carries none.
   */
  readToken(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, unknown> | undefined
    const cookieValue = cookies?.[REFRESH_COOKIE_NAME]
    return typeof cookieValue === 'string' && cookieValue !== '' ? cookieValue : undefined
  }

  /**
   * Stores the refresh token in the browser.
   *
   * @param response - Response that hands the token to the browser.
   * @param token - Refresh token.
   */
  writeToken(response: Response, token: string): void {
    response.cookie(REFRESH_COOKIE_NAME, token, { ...this.cookieOptions, maxAge: this.maxAge })
  }

  /**
   * Tells the browser to drop the cookie.
   *
   * @param response - Response to the client.
   */
  clearToken(response: Response): void {
    response.clearCookie(REFRESH_COOKIE_NAME, this.cookieOptions)
  }
}

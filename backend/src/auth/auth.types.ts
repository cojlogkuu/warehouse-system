/**
 * Claims the application puts into its tokens. The role is deliberately not among them.
 */
export interface JwtPayload {
  /** Identifier of the user. */
  sub: string
  /** Unique identifier of a refresh token; access tokens have none. */
  jti?: string
}

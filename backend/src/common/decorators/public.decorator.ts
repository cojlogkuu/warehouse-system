import { type CustomDecorator, SetMetadata } from '@nestjs/common'

/** Metadata key that marks a route as reachable without an access token. */
export const IS_PUBLIC_KEY = 'isPublic'

/**
 * Opens a route or a whole controller to requests without an access token.
 *
 * @returns The class or method decorator.
 */
export function Public(): CustomDecorator {
  return SetMetadata(IS_PUBLIC_KEY, true)
}

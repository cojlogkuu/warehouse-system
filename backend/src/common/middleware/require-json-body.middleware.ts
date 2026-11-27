import { UnsupportedMediaTypeException } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

/**
 * Rejects every request content that is not JSON: the API takes no forms, so a form posted by
 * a page of another site never reaches a route.
 *
 * A request without content passes whatever its type; browsers announce an empty `POST` with
 * `Content-Length: 0`.
 *
 * @param request - Incoming request.
 * @param _response - Unused response.
 * @param next - Continues the request, or receives the error answered with 415.
 */
export function requireJsonBody(request: Request, _response: Response, next: NextFunction): void {
  const { 'content-length': contentLength, 'transfer-encoding': transferEncoding } = request.headers
  const hasContent = transferEncoding !== undefined || Number(contentLength ?? 0) > 0
  if (hasContent && !request.is('application/json')) {
    next(new UnsupportedMediaTypeException('The request body must be application/json'))
    return
  }
  next()
}

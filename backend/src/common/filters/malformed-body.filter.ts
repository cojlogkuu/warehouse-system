import { type ArgumentsHost, BadRequestException, Catch } from '@nestjs/common'
import { BaseExceptionFilter } from '@nestjs/core'

/**
 * Hides what the JSON parser says about a request body it cannot read: the parser quotes the
 * body, which may contain a password.
 */
@Catch(BadRequestException)
export class MalformedBodyFilter extends BaseExceptionFilter {
  /**
   * Answers a bad request, replacing the message of the parser.
   *
   * @param exception - A bad request; one caused by the parser has a `SyntaxError` as its cause.
   * @param host - Context of the current request.
   */
  override catch(exception: BadRequestException, host: ArgumentsHost): void {
    const isUnreadable = exception.cause instanceof SyntaxError
    super.catch(
      isUnreadable ? new BadRequestException('The request body is not valid JSON') : exception,
      host,
    )
  }
}

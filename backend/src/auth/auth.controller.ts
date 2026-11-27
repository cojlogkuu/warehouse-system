import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Public } from '../common/decorators/public.decorator'
import type { AuthenticatedUser } from '../common/types'
import { INVALID_REFRESH_TOKEN } from './auth.constants'
import {
  AccessTokenDto,
  type AuthTokensDto,
  ChangePasswordDto,
  LoginDto,
  ProfileDto,
} from './auth.dto'
import { AuthService } from './auth.service'
import { RefreshCookie } from './refresh-cookie'

/**
 * REST routes of authentication; the only place that handles the refresh cookie.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  /**
   * Creates the controller.
   *
   * @param auth - Authentication logic.
   * @param cookie - Cookie of the refresh token.
   */
  constructor(
    private readonly auth: AuthService,
    private readonly cookie: RefreshCookie,
  ) {}

  /**
   * Logs in: returns an access token and sets the refresh cookie.
   *
   * @param dto - Credentials.
   * @param response - Response that receives the cookie.
   * @returns The access token.
   */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AccessTokenDto })
  @ApiUnauthorizedResponse({ description: 'Wrong credentials or deactivated account' })
  @ApiTooManyRequestsResponse()
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AccessTokenDto> {
    return this.deliver(await this.auth.login(dto), response)
  }

  /**
   * Rotates the refresh cookie and returns a new access token. A rejected cookie is cleared.
   *
   * @param request - Request that carries the cookie.
   * @param response - Response that receives the new cookie.
   * @returns The new access token.
   * @throws UnauthorizedException if there is no acceptable refresh token.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @ApiCookieAuth()
  @ApiOkResponse({ type: AccessTokenDto })
  @ApiUnauthorizedResponse({ description: 'Missing, expired or revoked refresh token' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AccessTokenDto> {
    try {
      const token = this.cookie.read(request)
      if (!token) {
        throw new UnauthorizedException(INVALID_REFRESH_TOKEN)
      }
      return this.deliver(await this.auth.refresh(token), response)
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.cookie.clear(response)
      }
      throw error
    }
  }

  /**
   * Ends the session of the refresh cookie and clears it.
   *
   * @param user - The authenticated user.
   * @param request - Request that carries the cookie.
   * @param response - Response that clears the cookie.
   * @returns A promise that resolves once the session has ended.
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiNoContentResponse()
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(user.id, this.cookie.read(request) ?? '')
    this.cookie.clear(response)
  }

  /**
   * Shows who is logged in.
   *
   * @param user - The authenticated user.
   * @returns The own profile.
   */
  @Get('me')
  @ApiBearerAuth()
  @ApiOkResponse({ type: ProfileDto })
  me(@CurrentUser() user: AuthenticatedUser): ProfileDto {
    return Object.assign(new ProfileDto(), user)
  }

  /**
   * Changes the own password. All sessions end, so the client has to log in again.
   *
   * @param user - The authenticated user.
   * @param dto - Current and new password.
   * @param response - Response that clears the cookie.
   * @returns A promise that resolves once the password is set.
   */
  @UseGuards(ThrottlerGuard)
  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiNoContentResponse()
  @ApiTooManyRequestsResponse()
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.changePassword(user.id, dto)
    this.cookie.clear(response)
  }

  /**
   * Splits the tokens between the cookie and the response body.
   *
   * @param tokens - Tokens of the session.
   * @param response - Response that receives the cookie.
   * @returns The body of the response.
   */
  private deliver(tokens: AuthTokensDto, response: Response): AccessTokenDto {
    this.cookie.write(response, tokens.refreshToken)
    const { accessToken, expiresIn } = tokens
    return Object.assign(new AccessTokenDto(), { accessToken, expiresIn })
  }
}

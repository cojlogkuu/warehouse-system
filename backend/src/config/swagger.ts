import type { INestApplication } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { API_PREFIX, REFRESH_COOKIE_NAME } from '../common/constants'

/** Path of the interactive API documentation. */
const SWAGGER_PATH = `${API_PREFIX}/docs`

/**
 * Publishes the OpenAPI description of the API and its interactive page.
 *
 * @param app - Application whose controllers are documented.
 */
export function setupSwagger(app: INestApplication): void {
  const options = new DocumentBuilder()
    .setTitle('Warehouse Inventory System API')
    .setDescription(
      'Log in, then paste the access token into "Authorize". The refresh token travels in an ' +
        'HttpOnly cookie that the browser sends on its own.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth(REFRESH_COOKIE_NAME)
    .build()
  SwaggerModule.setup(SWAGGER_PATH, app, () => SwaggerModule.createDocument(app, options))
}

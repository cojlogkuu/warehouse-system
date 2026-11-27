import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import { API_PREFIX } from './common/constants'
import { requireJsonBody } from './common/middleware/require-json-body.middleware'
import type { EnvironmentVariables } from './config/environment'
import { setupSwagger } from './config/swagger'

/**
 * Creates the Nest application, applies global settings and starts the HTTP server.
 *
 * @returns A promise that resolves once the server is listening.
 */
async function bootstrap(): Promise<void> {
  // The default parsers would also accept forms; only the JSON parser is registered below
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    // A plain options object: the rule objects only because its interface extends a Nest class
    // eslint-disable-next-line @typescript-eslint/no-unsafe-class-instance-assignment
    { bodyParser: false },
  )
  const config = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService)
  app.setGlobalPrefix(API_PREFIX)
  app.use(cookieParser())
  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }), credentials: true })
  app.use(requireJsonBody)
  app.useBodyParser('json')
  setupSwagger(app)
  app.enableShutdownHooks()
  await app.listen(config.get('PORT', { infer: true }))
}

/**
 * Logs why the application could not start and ends the process with an error code.
 *
 * @param error - Reason of the failed startup.
 */
function failStartup(error: unknown): void {
  new Logger('Bootstrap').error(error instanceof Error ? error.message : 'Unknown startup error')
  process.exit(1)
}

bootstrap().catch(failStartup)

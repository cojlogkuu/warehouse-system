import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import type { EnvironmentVariables } from './config/environment'

/**
 * Creates the Nest application, applies global settings and starts the HTTP server.
 *
 * @returns A promise that resolves once the server is listening.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  const config = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService)
  app.setGlobalPrefix('api')
  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }) })
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

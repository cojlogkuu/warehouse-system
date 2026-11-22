import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

const DEFAULT_PORT = 3000
const DEFAULT_CORS_ORIGIN = 'http://localhost:5173'

/**
 * Creates the Nest application, applies global settings and starts the HTTP server.
 *
 * @returns A promise that resolves once the server is listening.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? DEFAULT_CORS_ORIGIN })
  await app.listen(process.env.PORT ?? DEFAULT_PORT)
}

void bootstrap()

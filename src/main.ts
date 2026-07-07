import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as cookieParser from 'cookie-parser'
import * as fs from 'fs'
import * as crypto from 'crypto'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/http-exception.filter'
import * as https from 'https'

if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.randomUUID) {
  ;(globalThis as any).crypto = crypto
}

async function bootstrap() {
  const googleCredsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  const googleCredsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (googleCredsPath && googleCredsJson && !fs.existsSync(googleCredsPath)) {
    fs.writeFileSync(googleCredsPath, googleCredsJson, 'utf-8')
    console.log(`Credenciales de Google escritas en ${googleCredsPath}`)
  }
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)

  const expressApp = app.getHttpAdapter().getInstance() as any
  expressApp.set('trust proxy', 1)
  app.use(cookieParser())

  const allowedOrigins: string[] = (
    configService.get<string>('ALLOWED_ORIGINS') ||
    'http://localhost:5173,http://localhost:5174'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  app.enableCors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
        return callback(null, true)
      }
      callback(new Error('CORS no permitido: ' + origin))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  )

  app.useGlobalFilters(new AllExceptionsFilter())

  const port = configService.get<number>('PORT') || 8080

  await app.listen(port, '0.0.0.0')

  console.log(`🚀 Servidor corriendo en puerto ${port}`)

  setTimeout(() => {
    setInterval(() => {
      const domain = configService.get<string>('RAILWAY_PUBLIC_DOMAIN')
      if (domain) {
        https.get(`https://${domain}/api/health`, () => {}).on('error', () => {})
      }
    }, 4 * 60 * 1000)
  }, 30000)
}

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message, error.stack)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})

bootstrap().catch(err => {
  console.error('Error al iniciar servidor:', err)
  process.exit(1)
})

process.on('SIGTERM', async () => {
  console.log('SIGTERM recibido, cerrando servidor...')
  const app = await NestFactory.create(AppModule)
  await app.close()
  setTimeout(() => process.exit(0), 10000)
})

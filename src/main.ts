import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/http-exception.filter'
import * as https from 'https'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.enableCors({
    origin: function (origin, callback) {
      const permitidos = [
        'https://mundointerino.com',
        'https://www.mundointerino.com',
        'https://mundointerino-frontend.vercel.app',
        'https://mundointerino-frontend-git-main-jose-maria-s-projects24.vercel.app',
        'http://localhost:5173',
        'http://localhost:5174',
      ]
      if (!origin || permitidos.includes(origin) || /\.vercel\.app$/.test(origin)) {
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

  const configService = app.get(ConfigService)
  const port = configService.get<number>('PORT') || 8080

  await app.listen(port, '0.0.0.0')

  console.log(`🚀 Servidor corriendo en puerto ${port}`)

  // Keep-alive para Railway
  setTimeout(() => {
    setInterval(() => {
      const domain = configService.get<string>('RAILWAY_PUBLIC_DOMAIN')
      if (domain) {
        https.get(`https://${domain}/api/health`, () => {}).on('error', () => {})
      }
    }, 4 * 60 * 1000)
  }, 30000)
}

bootstrap().catch(err => {
  console.error('Error al iniciar servidor:', err)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM recibido, cerrando servidor...')
  const app = await NestFactory.create(AppModule)
  await app.close()
  setTimeout(() => process.exit(0), 10000)
})

import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { AppController } from './app.controller'
import { AuthModule } from './modules/auth/auth.module'
import { UsuariosModule } from './modules/usuarios/usuarios.module'
import { PisosModule } from './modules/pisos/pisos.module'
import { MundoModule } from './modules/mundo/mundo.module'
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module'
import { AdminModule } from './modules/admin/admin.module'
import { AnunciosModule } from './modules/anuncios/anuncios.module'
import { AutomatedVerificationModule } from './modules/automated-verification/automated-verification.module'
import { EmailModule } from './modules/email/email.module'
import { CiudadesModule } from './modules/ciudades/ciudades.module'
import { PostgresDatabaseModule } from './database/postgres.module'
import databaseConfig from './config/database.config'
import postgresConfig from './config/postgres.config'
import redisConfig from './config/redis.config'
import authConfig from './config/auth.config'
import emailConfig from './config/email.config'
import verificationConfig from './config/verification.config'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, postgresConfig, redisConfig, authConfig, emailConfig, verificationConfig],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
    }),
    PostgresDatabaseModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 60,
        },
      ],
    }),
    EmailModule,
    AutomatedVerificationModule,
    AuthModule,
    UsuariosModule,
    PisosModule,
    CiudadesModule,
    MundoModule,
    CloudinaryModule,
    AdminModule,
    AnunciosModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

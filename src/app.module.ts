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
import databaseConfig from './config/database.config'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 60,
        },
      ],
    }),
    AutomatedVerificationModule,
    AuthModule,
    UsuariosModule,
    PisosModule,
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

import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { AppController } from './app.controller'
import { AuthModule } from './modules/auth/auth.module'
import { UsuariosModule } from './modules/usuarios/usuarios.module'
import { PisosModule } from './modules/pisos/pisos.module'
import { MundoModule } from './modules/mundo/mundo.module'
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module'
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
    AuthModule,
    UsuariosModule,
    PisosModule,
    MundoModule,
    CloudinaryModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

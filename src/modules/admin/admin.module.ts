import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { UsuarioSchema } from '../usuarios/schemas/usuario.schema'
import { ImpersonationAuditEntity } from '../../database/entities/impersonation-audit.entity'
import { RefreshTokenEntity } from '../../database/entities/refresh-token.entity'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Usuario', schema: UsuarioSchema },
    ]),
    TypeOrmModule.forFeature([ImpersonationAuditEntity, RefreshTokenEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({
        secret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || '',
      }),
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

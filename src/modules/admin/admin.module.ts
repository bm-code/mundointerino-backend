import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { UsuarioEntity } from '../../database/entities/usuario.entity'
import { ImpersonationAuditEntity } from '../../database/entities/impersonation-audit.entity'
import { RefreshTokenEntity } from '../../database/entities/refresh-token.entity'
import { CloudinaryModule } from '../cloudinary/cloudinary.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([UsuarioEntity, ImpersonationAuditEntity, RefreshTokenEntity]),
    CloudinaryModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
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

import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UsuariosController } from './usuarios.controller'
import { UsuariosService } from './usuarios.service'
import { UsuarioEntity } from '../../database/entities/usuario.entity'
import { CloudinaryModule } from '../cloudinary/cloudinary.module'
import { AutomatedVerificationModule } from '../automated-verification/automated-verification.module'
import { EmailModule } from '../email/email.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([UsuarioEntity]),
    CloudinaryModule,
    AutomatedVerificationModule,
    EmailModule,
  ],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}

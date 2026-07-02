import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { UsuariosController } from './usuarios.controller'
import { UsuariosService } from './usuarios.service'
import { UsuarioSchema } from './schemas/usuario.schema'
import { CloudinaryModule } from '../cloudinary/cloudinary.module'
import { AutomatedVerificationModule } from '../automated-verification/automated-verification.module'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Usuario', schema: UsuarioSchema }]),
    CloudinaryModule,
    AutomatedVerificationModule,
  ],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}

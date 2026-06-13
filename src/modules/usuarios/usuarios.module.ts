import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { UsuariosController } from './usuarios.controller'
import { UsuariosService } from './usuarios.service'
import { UsuarioSchema } from './schemas/usuario.schema'
import { CloudinaryModule } from '../cloudinary/cloudinary.module'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Usuario', schema: UsuarioSchema }]),
    CloudinaryModule,
  ],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}

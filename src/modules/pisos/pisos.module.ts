import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MulterModule } from '@nestjs/platform-express'
import { PisosController } from './pisos.controller'
import { PisosService } from './pisos.service'
import { PisoEntity } from '../../database/entities/piso.entity'
import { CloudinaryModule } from '../cloudinary/cloudinary.module'
import { CiudadesModule } from '../ciudades/ciudades.module'
import { pisosStorage } from '../cloudinary/cloudinary-storage'

@Module({
  imports: [
    TypeOrmModule.forFeature([PisoEntity]),
    CloudinaryModule,
    CiudadesModule,
    MulterModule.register({ storage: pisosStorage }),
  ],
  controllers: [PisosController],
  providers: [PisosService],
})
export class PisosModule {}

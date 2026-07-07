import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PisosController } from './pisos.controller'
import { PisosService } from './pisos.service'
import { PisoEntity } from '../../database/entities/piso.entity'
import { CloudinaryModule } from '../cloudinary/cloudinary.module'
import { CiudadesModule } from '../ciudades/ciudades.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([PisoEntity]),
    CloudinaryModule,
    CiudadesModule,
  ],
  controllers: [PisosController],
  providers: [PisosService],
})
export class PisosModule {}

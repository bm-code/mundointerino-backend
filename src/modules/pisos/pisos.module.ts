import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { PisosController } from './pisos.controller'
import { PisosService } from './pisos.service'
import { PisoSchema } from './schemas/piso.schema'
import { CloudinaryModule } from '../cloudinary/cloudinary.module'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Piso', schema: PisoSchema }]),
    CloudinaryModule,
  ],
  controllers: [PisosController],
  providers: [PisosService],
})
export class PisosModule {}

import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CiudadesController } from './ciudades.controller'
import { CiudadesService } from './ciudades.service'
import { CiudadEntity } from '../../database/entities/ciudad.entity'

@Module({
  imports: [TypeOrmModule.forFeature([CiudadEntity])],
  controllers: [CiudadesController],
  providers: [CiudadesService],
  exports: [CiudadesService],
})
export class CiudadesModule {}

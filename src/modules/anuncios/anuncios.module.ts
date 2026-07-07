import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AnunciosController } from './anuncios.controller'
import { AnunciosService } from './anuncios.service'
import { AnuncioEntity } from '../../database/entities/anuncio.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([AnuncioEntity]),
  ],
  controllers: [AnunciosController],
  providers: [AnunciosService],
  exports: [AnunciosService],
})
export class AnunciosModule {}

import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AnunciosController } from './anuncios.controller'
import { AnunciosService } from './anuncios.service'
import { AnuncioSchema } from './schemas/anuncio.schema'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Anuncio', schema: AnuncioSchema }]),
  ],
  controllers: [AnunciosController],
  providers: [AnunciosService],
  exports: [AnunciosService],
})
export class AnunciosModule {}

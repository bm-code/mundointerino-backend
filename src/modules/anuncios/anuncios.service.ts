import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Anuncio, AnuncioDocument } from './schemas/anuncio.schema'
import { CreateAnuncioDto } from './dto/create-anuncio.dto'
import { UpdateAnuncioDto } from './dto/update-anuncio.dto'
import { QueryAnuncioDto } from './dto/query-anuncio.dto'

@Injectable()
export class AnunciosService {
  constructor(
    @InjectModel(Anuncio.name) private anuncioModel: Model<AnuncioDocument>,
  ) {}

  async findAll(query: QueryAnuncioDto) {
    const { administracion, tipo, pagina = 1, limite = 20 } = query
    const filter: any = { activo: true }

    if (administracion) filter.administracion = administracion
    if (tipo) filter.tipo = tipo

    filter.$or = [
      { fechaExpiracion: { $gte: new Date() } },
      { fechaExpiracion: null },
      { fechaExpiracion: { $exists: false } },
    ]

    const [anuncios, total] = await Promise.all([
      this.anuncioModel
        .find(filter)
        .sort({ destacado: -1, createdAt: -1 })
        .skip((pagina - 1) * limite)
        .limit(limite)
        .lean(),
      this.anuncioModel.countDocuments(filter),
    ])

    return { anuncios, total, pagina, totalPaginas: Math.ceil(total / limite) }
  }

  async findOne(id: string) {
    const anuncio = await this.anuncioModel.findById(id).lean()
    if (!anuncio) throw new NotFoundException('Anuncio no encontrado')
    return anuncio
  }

  async create(dto: CreateAnuncioDto) {
    return this.anuncioModel.create(dto)
  }

  async update(id: string, dto: UpdateAnuncioDto) {
    const anuncio = await this.anuncioModel
      .findByIdAndUpdate(id, dto, { new: true })
      .lean()
    if (!anuncio) throw new NotFoundException('Anuncio no encontrado')
    return anuncio
  }

  async remove(id: string) {
    const anuncio = await this.anuncioModel.findByIdAndDelete(id).lean()
    if (!anuncio) throw new NotFoundException('Anuncio no encontrado')
    return { mensaje: 'Anuncio eliminado correctamente' }
  }
}

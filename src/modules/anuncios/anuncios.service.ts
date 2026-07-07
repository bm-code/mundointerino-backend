import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThanOrEqual, IsNull } from 'typeorm'
import { AnuncioEntity } from '../../database/entities/anuncio.entity'
import { CreateAnuncioDto } from './dto/create-anuncio.dto'
import { UpdateAnuncioDto } from './dto/update-anuncio.dto'
import { QueryAnuncioDto } from './dto/query-anuncio.dto'
import { randomUUID } from 'crypto'

@Injectable()
export class AnunciosService {
  constructor(
    @InjectRepository(AnuncioEntity) private anuncioRepo: Repository<AnuncioEntity>,
  ) {}

  async findAll(query: QueryAnuncioDto) {
    const { administracion, tipo, pagina = 1, limite = 20 } = query
    const baseFilter: any = { activo: true }

    if (administracion) baseFilter.administracion = administracion
    if (tipo) baseFilter.tipo = tipo

    const where = [
      { ...baseFilter, fechaExpiracion: MoreThanOrEqual(new Date()) },
      { ...baseFilter, fechaExpiracion: IsNull() },
    ]

    const [anuncios, total] = await Promise.all([
      this.anuncioRepo.find({
        where,
        order: { destacado: 'DESC', createdAt: 'DESC' },
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      this.anuncioRepo.count({ where }),
    ])

    return { anuncios, total, pagina, totalPaginas: Math.ceil(total / limite) }
  }

  async findOne(id: string) {
    const anuncio = await this.anuncioRepo.findOneBy({ id })
    if (!anuncio) throw new NotFoundException('Anuncio no encontrado')
    return anuncio
  }

  async create(dto: CreateAnuncioDto) {
    const entity = this.anuncioRepo.create(dto as any) as unknown as AnuncioEntity
    entity.id = randomUUID().replace(/-/g, '').substring(0, 24)
    return this.anuncioRepo.save(entity)
  }

  async update(id: string, dto: UpdateAnuncioDto) {
    await this.anuncioRepo.update(id, dto as any)
    const anuncio = await this.anuncioRepo.findOneBy({ id })
    if (!anuncio) throw new NotFoundException('Anuncio no encontrado')
    return anuncio
  }

  async remove(id: string) {
    const anuncio = await this.anuncioRepo.findOneBy({ id })
    if (!anuncio) throw new NotFoundException('Anuncio no encontrado')
    await this.anuncioRepo.delete(id)
    return { mensaje: 'Anuncio eliminado correctamente' }
  }
}

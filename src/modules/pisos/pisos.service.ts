import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like, LessThanOrEqual, MoreThanOrEqual, Between } from 'typeorm'
import { PisoEntity } from '../../database/entities/piso.entity'
import { randomUUID } from 'crypto'
import { CreatePisoDto } from './dto/create-piso.dto'
import { UpdatePisoDto } from './dto/update-piso.dto'
import { QueryPisoDto } from './dto/query-piso.dto'
import { UploadService } from '../cloudinary/cloudinary.service'
import { CiudadesService } from '../ciudades/ciudades.service'

function slugifyCiudad(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

@Injectable()
export class PisosService {
  private readonly logger = new Logger(PisosService.name)
  constructor(
    @InjectRepository(PisoEntity) private pisoRepo: Repository<PisoEntity>,
    private readonly uploadService: UploadService,
    private readonly ciudadesService: CiudadesService,
  ) {}

  async findAll(query: QueryPisoDto) {
    const filtro: any = { activo: true }

    if (query.comunidad) filtro.comunidad = Like(`%${query.comunidad}%`)
    if (query.provincia) filtro.provincia = Like(`%${query.provincia}%`)
    if (query.ciudad) filtro.ciudad = Like(`%${query.ciudad}%`)
    if (query.tipo) filtro.tipoEstancia = query.tipo
    if (query.precioMin && query.precioMax) {
      filtro.precio = Between(Number(query.precioMin), Number(query.precioMax))
    } else if (query.precioMin) {
      filtro.precio = MoreThanOrEqual(Number(query.precioMin))
    } else if (query.precioMax) {
      filtro.precio = LessThanOrEqual(Number(query.precioMax))
    }
    if (query.habitaciones) filtro.habitaciones = MoreThanOrEqual(Number(query.habitaciones))
    if (query.banos) filtro.banos = MoreThanOrEqual(Number(query.banos))
    if (query.metrosMin && query.superficieMax) {
      filtro.metros = Between(Number(query.metrosMin), Number(query.superficieMax))
    } else if (query.metrosMin) {
      filtro.metros = MoreThanOrEqual(Number(query.metrosMin))
    } else if (query.superficieMax) {
      filtro.metros = LessThanOrEqual(Number(query.superficieMax))
    }

    const pagina = query.pagina || 1
    const limite = query.limite || 12
    const skip = (pagina - 1) * limite

    const total = await this.pisoRepo.count({ where: filtro })
    const pisos = await this.pisoRepo.find({
      where: filtro,
      order: { createdAt: 'DESC' },
      skip,
      take: limite,
      relations: { propietario: true },
    })

    return {
      pisos,
      total,
      paginas: Math.ceil(total / limite),
      paginaActual: pagina,
    }
  }

  async findOne(id: string) {
    const piso = await this.pisoRepo.findOne({
      where: { id },
      relations: { propietario: true },
    })
    if (!piso) throw new NotFoundException('Piso no encontrado')
    return piso
  }

  async misPisos(userId: string) {
    return this.pisoRepo.find({
      where: { propietarioId: userId },
      order: { createdAt: 'DESC' },
    })
  }

  async create(
    dto: CreatePisoDto,
    files: Express.Multer.File[],
    userId: string,
  ) {
    const fotos = files ? files.filter(f => f.path && f.path !== 'undefined').map(f => f.path) : []
    if (files && files.length > 0 && fotos.length === 0) {
      this.logger.warn(`Recibidos ${files.length} archivos pero ninguno tiene URL válida. paths: ${files.map(f => String(f.path)).join(', ')}`)
    }

    let comunidad = dto.comunidad || ''
    let provincia = dto.provincia || ''
    let ciudadSlug = ''

    const slug = slugifyCiudad(dto.ciudad)
    const ciudad = await this.ciudadesService.porSlug(slug)
    if (ciudad) {
      comunidad = ciudad.comunidadNombre
      provincia = ciudad.provinciaNombre
      ciudadSlug = ciudad.slug
    }

    const data = {
      ...dto,
      ciudadSlug,
      comunidad,
      provincia,
      servicios: dto.servicios || [],
      fotos,
      propietarioId: userId,
      activo: true,
    }
    const entity = this.pisoRepo.create(data)
    entity.id = randomUUID().replace(/-/g, '').substring(0, 24)
    return this.pisoRepo.save(entity)
  }

  async update(
    id: string,
    dto: UpdatePisoDto & { fotosActuales?: string[]; activoRaw?: any },
    files: Express.Multer.File[],
    userId: string,
  ) {
    const piso = await this.pisoRepo.findOneBy({ id })
    if (!piso) throw new NotFoundException('Piso no encontrado')
    if (piso.propietarioId !== userId) {
      throw new ForbiddenException('No tienes permiso para editar este piso')
    }

    const fotosActuales: string[] = Array.isArray(dto.fotosActuales)
      ? dto.fotosActuales
      : dto.fotosActuales
        ? [dto.fotosActuales]
        : []

    const fotosEliminadas = piso.fotos.filter(url => url && url !== 'undefined' && !fotosActuales.includes(url))
    await this.uploadService.deleteImages(fotosEliminadas)

    const fotosNuevas = files ? files.filter(f => f.path && f.path !== 'undefined').map(f => f.path) : []
    const activo = dto.activoRaw === true || dto.activoRaw === 'true'

    let comunidad = dto.comunidad || piso.comunidad || ''
    let provincia = dto.provincia || piso.provincia || ''
    let ciudadSlug = piso.ciudadSlug || ''

    if (dto.ciudad) {
      const slug = slugifyCiudad(dto.ciudad)
      const ciudad = await this.ciudadesService.porSlug(slug)
      if (ciudad) {
        comunidad = ciudad.comunidadNombre
        provincia = ciudad.provinciaNombre
        ciudadSlug = ciudad.slug
      }
    }

    const { fotosActuales: _fotosActuales, activoRaw: _activoRaw, ...dtoLimpio } = dto as any

    await this.pisoRepo.update(id, {
      ...dtoLimpio,
      ciudadSlug,
      comunidad,
      provincia,
      servicios: dto.servicios || [],
      activo,
      fotos: [...fotosActuales, ...fotosNuevas],
    })

    return this.pisoRepo.findOneBy({ id })
  }

  async toggleDisponibilidad(id: string, userId: string) {
    const piso = await this.pisoRepo.findOneBy({ id })
    if (!piso) throw new NotFoundException('Piso no encontrado')
    if (piso.propietarioId !== userId) {
      throw new ForbiddenException('No tienes permiso')
    }

    await this.pisoRepo.update(id, { activo: !piso.activo })
    return this.pisoRepo.findOneBy({ id })
  }

  async remove(id: string, userId: string) {
    const piso = await this.pisoRepo.findOneBy({ id })
    if (!piso) throw new NotFoundException('Piso no encontrado')
    if (piso.propietarioId !== userId) {
      throw new ForbiddenException('No tienes permiso')
    }

    await this.uploadService.deleteImages(piso.fotos)
    await this.pisoRepo.delete(id)
    return { mensaje: 'Piso eliminado correctamente' }
  }
}

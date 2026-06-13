import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Piso, PisoDocument } from './schemas/piso.schema'
import { CreatePisoDto } from './dto/create-piso.dto'
import { UpdatePisoDto } from './dto/update-piso.dto'
import { QueryPisoDto } from './dto/query-piso.dto'
import { UploadService } from '../cloudinary/cloudinary.service'

@Injectable()
export class PisosService {
  constructor(
    @InjectModel(Piso.name) private pisoModel: Model<PisoDocument>,
    private readonly uploadService: UploadService,
  ) {}

  async findAll(query: QueryPisoDto) {
    const filtro: any = { activo: true }

    if (query.comunidad) filtro.comunidad = new RegExp(query.comunidad, 'i')
    if (query.provincia) filtro.provincia = new RegExp(query.provincia, 'i')
    if (query.ciudad) filtro.ciudad = new RegExp(query.ciudad, 'i')
    if (query.tipo) filtro.tipoEstancia = query.tipo
    if (query.precioMax) filtro.precio = { $lte: query.precioMax }
    if (query.habitaciones) filtro.habitaciones = query.habitaciones

    const pagina = query.pagina || 1
    const limite = query.limite || 12

    const total = await this.pisoModel.countDocuments(filtro)
    const pisos = await this.pisoModel
      .find(filtro)
      .populate('propietario', 'nombre telefono email')
      .sort({ createdAt: -1 })
      .limit(limite)
      .skip((pagina - 1) * limite)
      .lean()

    return {
      pisos,
      total,
      paginas: Math.ceil(total / limite),
      paginaActual: pagina,
    }
  }

  async findOne(id: string) {
    const piso = await this.pisoModel
      .findById(id)
      .populate('propietario', 'nombre telefono email')
      .lean()
    if (!piso) throw new NotFoundException('Piso no encontrado')
    return piso
  }

  async misPisos(userId: string) {
    return this.pisoModel
      .find({ propietario: userId })
      .sort({ createdAt: -1 })
      .lean()
  }

  async create(
    dto: CreatePisoDto,
    files: Express.Multer.File[],
    userId: string,
  ) {
    const fotos = files ? files.map(f => f.path) : []
    const piso = await this.pisoModel.create({
      ...dto,
      comunidad: dto.comunidad || '',
      provincia: dto.provincia || '',
      servicios: dto.servicios || [],
      fotos,
      propietario: userId,
      activo: true,
    })
    return piso.toObject()
  }

  async update(
    id: string,
    dto: UpdatePisoDto & { fotosActuales?: string[]; activoRaw?: any },
    files: Express.Multer.File[],
    userId: string,
  ) {
    const piso = await this.pisoModel.findById(id)
    if (!piso) throw new NotFoundException('Piso no encontrado')
    if (piso.propietario.toString() !== userId) {
      throw new ForbiddenException('No tienes permiso para editar este piso')
    }

    const fotosActuales: string[] = Array.isArray(dto.fotosActuales)
      ? dto.fotosActuales
      : dto.fotosActuales
        ? [dto.fotosActuales]
        : []

    const fotosEliminadas = piso.fotos.filter(url => !fotosActuales.includes(url))
    await this.uploadService.deleteImages(fotosEliminadas)

    const fotosNuevas = files ? files.map(f => f.path) : []
    const activo = dto.activoRaw === true || dto.activoRaw === 'true'

    const actualizado = await this.pisoModel
      .findByIdAndUpdate(
        id,
        {
          ...dto,
          comunidad: dto.comunidad || '',
          provincia: dto.provincia || '',
          servicios: dto.servicios || [],
          activo,
          fotos: [...fotosActuales, ...fotosNuevas],
        },
        { new: true },
      )
      .lean()

    return actualizado
  }

  async toggleDisponibilidad(id: string, userId: string) {
    const piso = await this.pisoModel.findById(id)
    if (!piso) throw new NotFoundException('Piso no encontrado')
    if (piso.propietario.toString() !== userId) {
      throw new ForbiddenException('No tienes permiso')
    }

    piso.activo = !piso.activo
    await piso.save()
    return piso.toObject()
  }

  async remove(id: string, userId: string) {
    const piso = await this.pisoModel.findById(id)
    if (!piso) throw new NotFoundException('Piso no encontrado')
    if (piso.propietario.toString() !== userId) {
      throw new ForbiddenException('No tienes permiso')
    }

    await this.uploadService.deleteImages(piso.fotos)
    await piso.deleteOne()
    return { mensaje: 'Piso eliminado correctamente' }
  }
}

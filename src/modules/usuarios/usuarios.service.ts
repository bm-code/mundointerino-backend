import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import * as bcrypt from 'bcryptjs'
import { Usuario, UsuarioDocument } from './schemas/usuario.schema'
import { UpdateUsuarioDto } from './dto/update-usuario.dto'
import { ChangePasswordDto } from './dto/change-password.dto'

@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
  ) {}

  async getProfile(userId: string) {
    const usuario = await this.usuarioModel.findById(userId).select('-password').lean()
    if (!usuario) throw new NotFoundException('Usuario no encontrado')
    return usuario
  }

  async updateProfile(userId: string, dto: UpdateUsuarioDto) {
    const usuario = await this.usuarioModel
      .findByIdAndUpdate(userId, dto, { new: true, runValidators: true })
      .select('-password')
      .lean()
    if (!usuario) throw new NotFoundException('Usuario no encontrado')
    return usuario
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const usuario = await this.usuarioModel.findById(userId)
    if (!usuario) throw new NotFoundException('Usuario no encontrado')

    const valida = await bcrypt.compare(dto.passwordActual, usuario.password)
    if (!valida) throw new BadRequestException('La contraseña actual no es correcta')

    usuario.password = await bcrypt.hash(dto.passwordNueva, 10)
    await usuario.save()

    return { mensaje: 'Contraseña actualizada correctamente' }
  }

  async findAll() {
    return this.usuarioModel.find().select('-password').sort({ createdAt: -1 }).lean()
  }

  async uploadVerificacion(
    userId: string,
    tipoDocumento: string,
    administracion: string,
    urlDocumento: string,
  ) {
    const usuario = await this.usuarioModel
      .findByIdAndUpdate(
        userId,
        { verificacionEstado: 'pendiente', tipoDocumento, administracion, urlDocumento },
        { new: true },
      )
      .select('-password')
      .lean()

    if (!usuario) throw new NotFoundException('Usuario no encontrado')
    return usuario
  }

  async verificar(id: string, estado: string, motivoRechazo?: string) {
    if (!['verificado', 'rechazado', 'pendiente'].includes(estado)) {
      throw new BadRequestException('Estado no válido')
    }

    const usuario = await this.usuarioModel
      .findByIdAndUpdate(
        id,
        {
          verificacionEstado: estado,
          motivoRechazo: estado === 'rechazado' ? motivoRechazo || '' : '',
        },
        { new: true },
      )
      .select('-password')
      .lean()

    if (!usuario) throw new NotFoundException('Usuario no encontrado')
    return usuario
  }
}

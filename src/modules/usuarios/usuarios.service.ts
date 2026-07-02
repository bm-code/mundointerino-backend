import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import * as bcrypt from 'bcryptjs'
import { Usuario, UsuarioDocument } from './schemas/usuario.schema'
import { UpdateUsuarioDto } from './dto/update-usuario.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { AutomatedVerificationService } from '../automated-verification/automated-verification.service'

@Injectable()
export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name)

  constructor(
    @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
    private readonly automatedVerificationService: AutomatedVerificationService,
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
    userName: string,
  ) {
    const usuarioActual = await this.usuarioModel.findById(userId)
    if (!usuarioActual) throw new NotFoundException('Usuario no encontrado')

    if (usuarioActual.ultimaSubidaDocumento) {
      const horasDesdeUltimaSubida =
        (Date.now() - usuarioActual.ultimaSubidaDocumento.getTime()) / (1000 * 60 * 60)
      if (horasDesdeUltimaSubida < 24) {
        throw new BadRequestException(
          'Solo puedes subir un documento una vez al día. Vuelve a intentarlo más tarde.',
        )
      }
    }

    const usuario = await this.usuarioModel
      .findByIdAndUpdate(
        userId,
        {
          verificacionEstado: 'pendiente',
          tipoDocumento,
          administracion,
          urlDocumento,
          verificationConfidence: null,
          verificationNotes: '',
          verificationDate: null,
          verificationType: null,
          ultimaSubidaDocumento: new Date(),
        },
        { new: true },
      )
      .select('-password')
      .lean()

    if (!usuario) throw new NotFoundException('Usuario no encontrado')

    this.automatedVerificationService
      .verifyDocument(urlDocumento, tipoDocumento, administracion, userName)
      .then((result) => {
        return this.automatedVerificationService.applyVerificationResult(
          userId,
          result,
        )
      })
      .catch((error) => {
        this.logger.error(
          `Automated verification failed for user ${userId}: ${error.message}`,
        )
      })

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

  async deleteDocumento(userId: string) {
    const usuario = await this.usuarioModel.findById(userId)
    if (!usuario) throw new NotFoundException('Usuario no encontrado')

    if (!usuario.urlDocumento) {
      throw new BadRequestException('No tienes un documento para eliminar')
    }

    if (usuario.ultimaSubidaDocumento) {
      const horasDesdeUltimaSubida =
        (Date.now() - usuario.ultimaSubidaDocumento.getTime()) / (1000 * 60 * 60)
      if (horasDesdeUltimaSubida < 24) {
        throw new BadRequestException(
          'Solo puedes eliminar y volver a subir un documento una vez al día.',
        )
      }
    }

    const updated = await this.usuarioModel
      .findByIdAndUpdate(
        userId,
        {
          urlDocumento: null,
          tipoDocumento: null,
          administracion: null,
          verificationConfidence: null,
          verificationNotes: '',
          verificationDate: null,
          verificationType: null,
        },
        { new: true },
      )
      .select('-password')
      .lean()

    return updated
  }

  async resetUploadLimit(userId: string) {
    const usuario = await this.usuarioModel
      .findByIdAndUpdate(
        userId,
        { ultimaSubidaDocumento: null },
        { new: true },
      )
      .select('-password')
      .lean()

    if (!usuario) throw new NotFoundException('Usuario no encontrado')
    return usuario
  }
}

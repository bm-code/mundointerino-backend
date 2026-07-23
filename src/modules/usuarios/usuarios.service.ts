import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import { UsuarioEntity } from '../../database/entities/usuario.entity'
import { UpdateUsuarioDto } from './dto/update-usuario.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { AutomatedVerificationService } from '../automated-verification/automated-verification.service'
import { VerificationDispatcher } from '../automated-verification/verification.dispatcher'
import { UploadService } from '../cloudinary/cloudinary.service'
import { EmailService } from '../email/email.service'

@Injectable()
export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name)

  constructor(
    @InjectRepository(UsuarioEntity) private usuarioRepo: Repository<UsuarioEntity>,
    private readonly automatedVerificationService: AutomatedVerificationService,
    private readonly verificationDispatcher: VerificationDispatcher,
    private readonly uploadService: UploadService,
    private readonly emailService: EmailService,
  ) {}

  async getProfile(userId: string) {
    const usuario = await this.usuarioRepo.findOneBy({ id: userId })
    if (!usuario) throw new NotFoundException('Usuario no encontrado')
    const { password, ...result } = usuario
    return result
  }

  async updateProfile(userId: string, dto: UpdateUsuarioDto) {
    const usuario = await this.usuarioRepo.findOneBy({ id: userId })
    if (!usuario) throw new NotFoundException('Usuario no encontrado')
    Object.assign(usuario, dto)
    const saved = await this.usuarioRepo.save(usuario)
    const { password, ...result } = saved
    return result
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const usuario = await this.usuarioRepo.findOneBy({ id: userId })
    if (!usuario) throw new NotFoundException('Usuario no encontrado')

    const valida = await bcrypt.compare(dto.passwordActual, usuario.password)
    if (!valida) throw new BadRequestException('La contraseña actual no es correcta')

    usuario.password = await bcrypt.hash(dto.passwordNueva, 10)
    await this.usuarioRepo.save(usuario)

    return { mensaje: 'Contraseña actualizada correctamente' }
  }

  async findAll() {
    const usuarios = await this.usuarioRepo.find({ order: { createdAt: 'DESC' } })
    return usuarios.map(({ password, ...u }) => u)
  }

  async uploadVerificacion(
    userId: string,
    tipoDocumento: string,
    administracion: string,
    urlDocumento: string,
    userName: string,
  ) {
    const usuario = await this.usuarioRepo.findOneBy({ id: userId })
    if (!usuario) throw new NotFoundException('Usuario no encontrado')

    if (usuario.rol !== 'docente') {
      throw new BadRequestException(
        'La verificación documental es solo para interinos. Los propietarios son verificados manualmente por el equipo.',
      )
    }

    if (usuario.ultimaSubidaDocumento) {
      const horasDesdeUltimaSubida =
        (Date.now() - usuario.ultimaSubidaDocumento.getTime()) / (1000 * 60 * 60)
      if (horasDesdeUltimaSubida < 24) {
        throw new BadRequestException(
          'Solo puedes subir un documento una vez al día. Vuelve a intentarlo más tarde.',
        )
      }
    }

    Object.assign(usuario, {
      verificacionEstado: 'procesando',
      tipoDocumento,
      administracion,
      urlDocumento,
      verificationConfidence: null,
      verificationNotes: '',
      verificationDate: null,
      verificationType: null,
      verificationAttempts: 0,
      verificationLastError: '',
      ultimaSubidaDocumento: new Date(),
    })
    await this.usuarioRepo.save(usuario)

    this.verificationDispatcher.enqueue(
      userId,
      urlDocumento,
      tipoDocumento,
      administracion,
      userName || '',
    )

    const { password, ...result } = usuario
    return result
  }

  async verificar(id: string, estado: string, motivoRechazo?: string) {
    const estadosValidos = ['verificado', 'rechazado', 'pendiente', 'procesando', 'pendiente-revision-manual']
    if (!estadosValidos.includes(estado)) {
      throw new BadRequestException('Estado no válido')
    }

    const usuario = await this.usuarioRepo.findOneBy({ id })
    if (!usuario) throw new NotFoundException('Usuario no encontrado')

    usuario.verificacionEstado = estado
    usuario.motivoRechazo = estado === 'rechazado' ? motivoRechazo || '' : ''
    await this.usuarioRepo.save(usuario)

    if (estado === 'verificado' || estado === 'rechazado') {
      this.emailService.sendVerificationStatusNotification(usuario.email, {
        userName: usuario.nombre,
        estado,
        motivoRechazo: estado === 'rechazado' ? motivoRechazo : undefined,
      }).catch((err) => this.logger.error(`Error enviando email de estado de verificación: ${(err as Error).message}`))
    }

    // RGPD — minimización: si queda verificado, eliminar el documento de Cloudinary.
    if (estado === 'verificado') {
      await this.cleanupDocumentUrl(usuario)
    }

    const { password, ...result } = usuario
    return result
  }

  async deleteDocumento(userId: string) {
    const usuario = await this.usuarioRepo.findOneBy({ id: userId })
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

    const urlParaBorrar = usuario.urlDocumento
    Object.assign(usuario, {
      urlDocumento: null,
      tipoDocumento: null,
      administracion: null,
      verificationConfidence: null,
      verificationNotes: '',
      verificationDate: null,
      verificationType: null,
    })
    await this.usuarioRepo.save(usuario)

    // RGPD — minimización: borrar el archivo en Cloudinary de forma no bloqueante.
    await this.uploadService.deleteByUrl(urlParaBorrar).catch((err) => {
      this.logger.error(`No se pudo borrar documento de Cloudinary (user ${userId}): ${(err as Error).message}`)
    })

    const { password, ...result } = usuario
    return result
  }

  async solicitarRevisionManual(userId: string) {
    const usuario = await this.usuarioRepo.findOneBy({ id: userId })
    if (!usuario) throw new NotFoundException('Usuario no encontrado')

    if (!usuario.urlDocumento) {
      throw new BadRequestException('No tienes un documento subido para revisar')
    }

    usuario.verificacionEstado = 'pendiente-revision-manual'
    usuario.manualReviewRequestedAt = new Date() as any
    await this.usuarioRepo.save(usuario)

    const admins = await this.usuarioRepo.find({
      where: { rol: 'admin' },
      select: { email: true } as any,
    })
    const adminEmails = admins.map((a) => a.email).filter(Boolean)

    await this.emailService.sendManualReviewNotification(adminEmails, {
      userName: usuario.nombre,
      userId,
      documentType: usuario.tipoDocumento || '',
      administration: usuario.administracion || '',
      confidence: usuario.verificationConfidence || 0,
    })

    const { password, ...result } = usuario
    return result
  }

  /**
   * RGPD — minimización de datos.
   * Elimina el documento de Cloudinary y limpia la URL del usuario.
   * No lanza: si Cloudinary falla, queda en DB pero se loguea.
   */
  private async cleanupDocumentUrl(usuario: UsuarioEntity): Promise<void> {
    if (!usuario.urlDocumento) return
    const url = usuario.urlDocumento
    const ok = await this.uploadService.deleteByUrl(url).catch((err) => {
      this.logger.error(`Cloudinary deleteByUrl falló (user ${usuario.id}): ${(err as Error).message}`)
      return false
    })
    if (ok) {
      usuario.urlDocumento = null
      usuario.documentUrlDeletedAt = new Date() as any
      await this.usuarioRepo.save(usuario)
      this.logger.log(`Documento de ${usuario.id} eliminado de Cloudinary (RGPD minimización)`)
    }
  }

  async resetUploadLimit(userId: string) {
    const usuario = await this.usuarioRepo.findOneBy({ id: userId })
    if (!usuario) throw new NotFoundException('Usuario no encontrado')

    usuario.ultimaSubidaDocumento = null as any
    await this.usuarioRepo.save(usuario)

    const { password, ...result } = usuario
    return result
  }

  async reverify(id: string): Promise<{ mensaje: string }> {
    const usuario = await this.usuarioRepo.findOneBy({ id })
    if (!usuario) throw new NotFoundException('Usuario no encontrado')
    if (!usuario.urlDocumento) {
      throw new BadRequestException('El usuario no ha subido documentación')
    }

    usuario.verificacionEstado = 'procesando'
    usuario.verificationAttempts = 0
    usuario.verificationLastError = ''
    await this.usuarioRepo.save(usuario)

    this.verificationDispatcher.enqueue(
      id,
      usuario.urlDocumento,
      usuario.tipoDocumento,
      usuario.administracion,
      usuario.nombre,
    )

    return { mensaje: 'Re-verificación encolada' }
  }
}

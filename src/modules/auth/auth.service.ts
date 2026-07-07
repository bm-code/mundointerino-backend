import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { Response, Request } from 'express'
import { Usuario, UsuarioDocument } from '../usuarios/schemas/usuario.schema'
import { RefreshTokenEntity } from '../../database/entities/refresh-token.entity'
import { RegistroDto } from './dto/registro.dto'
import { LoginDto } from './dto/login.dto'
import { ReenviarVerificacionDto } from './dto/reenviar-verificacion.dto'
import { setAuthCookies, clearAuthCookies, getCookieConfig, CookieConfig } from './cookies.util'
import { EmailService } from '../email/email.service'

export interface UsuarioPublico {
  id: string
  nombre: string
  email: string
  rol: string
  telefono: string
  verificacionEstado: string
  administracion: string | null
  emailVerificado: boolean
}

@Injectable()
export class AuthService {
  private readonly jwtAccessSecret: string
  private readonly jwtRefreshSecret: string
  private readonly accessExpiresIn: string
  private readonly refreshExpiresIn: string
  private readonly cookieConfig: CookieConfig
  private readonly frontendUrl: string
  private readonly emailVerificationTtlHours: number
  private readonly emailReenvioCooldownSeg: number
  private readonly emailReenvioMaxIntentos: number

  constructor(
    @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
    @InjectRepository(RefreshTokenEntity) private refreshTokenRepo: Repository<RefreshTokenEntity>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {
    this.jwtAccessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || ''
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || this.jwtAccessSecret
    this.accessExpiresIn = process.env.JWT_ACCESS_EXPIRES || '1h'
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES || '7d'
    this.cookieConfig = getCookieConfig({
      cookieDomain: process.env.COOKIE_DOMAIN,
      cookieSecure: process.env.COOKIE_SECURE,
      cookieSameSite: process.env.COOKIE_SAMESITE,
    })
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    this.emailVerificationTtlHours = Number(process.env.EMAIL_VERIFICATION_TTL_HOURS) || 24
    this.emailReenvioCooldownSeg = Number(process.env.EMAIL_REENVIO_COOLDOWN_SEG) || 60
    this.emailReenvioMaxIntentos = Number(process.env.EMAIL_REENVIO_MAX_INTENTOS) || 5
  }

  async registro(dto: RegistroDto): Promise<{ mensaje: string }> {
    const emailNormalizado = dto.email.toLowerCase().trim()

    const existe = await this.usuarioModel.findOne({ email: emailNormalizado })
    if (existe) throw new ConflictException('Ya existe un usuario con ese email')

    if (!['docente', 'propietario'].includes(dto.rol)) {
      throw new BadRequestException('Rol no válido')
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)

    const usuario = await this.usuarioModel.create({
      nombre: dto.nombre.trim(),
      email: emailNormalizado,
      password: passwordHash,
      rol: dto.rol,
      telefono: dto.telefono || '',
      verificacionEstado: 'pendiente',
      emailVerificado: false,
      emailVerificacionEstado: 'pendiente',
      emailVerificacionIntentos: 0,
    })

    const token = this.emitirTokenVerificacionEmail(usuario._id.toString())

    await this.usuarioModel.updateOne(
      { _id: usuario._id },
      {
        emailVerificacionExpira: new Date(Date.now() + this.emailVerificationTtlHours * 60 * 60 * 1000),
        ultimoReenvioVerificacion: new Date(),
      },
    )

    this.emailService.sendEmailVerification(emailNormalizado, token).catch((err) => {
      console.error('Error enviando email de verificación:', err.message)
    })

    return { mensaje: 'email-enviado' }
  }

  async login(dto: LoginDto, res: Response): Promise<{ usuario: UsuarioPublico }> {
    if (!dto.email || !dto.password) {
      throw new BadRequestException('Faltan credenciales')
    }

    const usuario = await this.usuarioModel.findOne({
      email: dto.email.toLowerCase().trim(),
    })

    if (!usuario) throw new UnauthorizedException('Credenciales incorrectas')

    const passwordValida = await bcrypt.compare(dto.password, usuario.password)
    if (!passwordValida) throw new UnauthorizedException('Credenciales incorrectas')

    const familiaId = randomUUID()
    const accessToken = this.emitirAccessToken(usuario)
    const refreshToken = await this.emitirRefreshToken(usuario._id.toString(), familiaId)

    setAuthCookies(res, { accessToken, refreshToken }, this.cookieConfig)

    return { usuario: this.usuarioPublico(usuario) }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const refreshTokenCookie = (req.cookies as Record<string, string>)?.refresh_token
    if (!refreshTokenCookie) {
      throw new UnauthorizedException('No refresh token')
    }

    let payload: { sub: string; jti: string; familiaId: string; tipo: string }
    try {
      payload = await this.jwtService.verifyAsync(refreshTokenCookie, {
        secret: this.jwtRefreshSecret,
      })
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado')
    }

    if (payload.tipo !== 'refresh') {
      throw new UnauthorizedException('Tipo de token no válido')
    }

    const storedToken = await this.refreshTokenRepo.findOne({ where: { jti: payload.jti } })
    if (!storedToken) {
      throw new UnauthorizedException('Refresh token no encontrado')
    }

    if (storedToken.revokedAt && storedToken.replacedByToken) {
      await this.refreshTokenRepo.update(
        { familiaId: storedToken.familiaId },
        { revokedAt: new Date() },
      )
      throw new UnauthorizedException('Reuso de refresh token detectado — sesión revocada')
    }

    if (storedToken.revokedAt) {
      throw new UnauthorizedException('Refresh token revocado')
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expirado')
    }

    const usuario = await this.usuarioModel.findById(payload.sub).select('-password').lean()
    if (!usuario) throw new UnauthorizedException('Usuario no encontrado')

    const newJti = randomUUID()
    const newAccessToken = this.emitirAccessToken(usuario)
    const newRefreshToken = this.jwtService.sign(
      { sub: usuario._id.toString(), jti: newJti, familiaId: storedToken.familiaId, tipo: 'refresh' },
      { secret: this.jwtRefreshSecret, expiresIn: this.refreshExpiresIn as any },
    )

    await this.refreshTokenRepo.update(
      { jti: payload.jti },
      { revokedAt: new Date(), replacedByToken: newJti },
    )

    await this.refreshTokenRepo.save({
      jti: newJti,
      usuarioId: usuario._id.toString(),
      familiaId: storedToken.familiaId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    setAuthCookies(res, { accessToken: newAccessToken, refreshToken: newRefreshToken }, this.cookieConfig)
  }

  async me(usuario: any): Promise<{ usuario: UsuarioPublico }> {
    return { usuario: this.usuarioPublico(usuario) }
  }

  async logout(req: Request, res: Response): Promise<void> {
    const refreshTokenCookie = (req.cookies as Record<string, string>)?.refresh_token
    if (refreshTokenCookie) {
      try {
        const payload = await this.jwtService.verifyAsync(refreshTokenCookie, {
          secret: this.jwtRefreshSecret,
        })
        if (payload?.jti) {
          await this.refreshTokenRepo.update({ jti: payload.jti }, { revokedAt: new Date() })
        }
      } catch {
        // Token invalid, just clear cookies
      }
    }
    clearAuthCookies(res, this.cookieConfig)
  }

  async verificarEmail(token: string, res: Response): Promise<{ usuario: UsuarioPublico }> {
    let payload: { sub: string; tipo: string }
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.jwtAccessSecret,
      })
    } catch (error: any) {
      if (error?.name === 'TokenExpiredError') {
        throw new ForbiddenException('token-expirado')
      }
      throw new BadRequestException('Token de verificación inválido')
    }

    if (payload.tipo !== 'email-verify') {
      throw new BadRequestException('Tipo de token no válido')
    }

    const usuario = await this.usuarioModel.findById(payload.sub).select('-password').lean()
    if (!usuario) throw new BadRequestException('Usuario no encontrado')

    if (usuario.emailVerificado) {
      const accessToken = this.emitirAccessToken(usuario)
      const refreshToken = await this.emitirRefreshToken(usuario._id.toString(), randomUUID())
      setAuthCookies(res, { accessToken, refreshToken }, this.cookieConfig)
      return { usuario: this.usuarioPublico(usuario) }
    }

    const actualizado = await this.usuarioModel
      .findByIdAndUpdate(
        payload.sub,
        {
          emailVerificado: true,
          emailVerificacionEstado: 'verificado',
          emailVerificacionTokenHash: null,
          emailVerificacionExpira: null,
          emailVerificadoEn: new Date(),
        },
        { new: true },
      )
      .select('-password')
      .lean()

    if (!actualizado) throw new BadRequestException('Usuario no encontrado')

    const accessToken = this.emitirAccessToken(actualizado)
    const refreshToken = await this.emitirRefreshToken(actualizado._id.toString(), randomUUID())
    setAuthCookies(res, { accessToken, refreshToken }, this.cookieConfig)

    return { usuario: this.usuarioPublico(actualizado) }
  }

  async reenviarVerificacion(dto: ReenviarVerificacionDto): Promise<{ mensaje: string }> {
    const email = dto.email.toLowerCase().trim()
    const usuario = await this.usuarioModel.findOne({ email })

    if (!usuario) {
      return { mensaje: 'email-enviado' }
    }

    if (usuario.emailVerificado) {
      throw new BadRequestException('email-ya-verificado')
    }

    if (usuario.emailVerificacionIntentos >= this.emailReenvioMaxIntentos) {
      throw new BadRequestException('maximo-intentos-alcanzado')
    }

    if (usuario.ultimoReenvioVerificacion) {
      const segundosDesdeUltimo = (Date.now() - usuario.ultimoReenvioVerificacion.getTime()) / 1000
      if (segundosDesdeUltimo < this.emailReenvioCooldownSeg) {
        throw new BadRequestException('demasiados-intentos')
      }
    }

    const token = this.emitirTokenVerificacionEmail(usuario._id.toString())

    await this.usuarioModel.updateOne(
      { _id: usuario._id },
      {
        emailVerificacionIntentos: (usuario.emailVerificacionIntentos || 0) + 1,
        emailVerificacionExpira: new Date(Date.now() + this.emailVerificationTtlHours * 60 * 60 * 1000),
        ultimoReenvioVerificacion: new Date(),
      },
    )

    this.emailService.sendEmailVerification(email, token).catch((err) => {
      console.error('Error reenviando email de verificación:', err.message)
    })

    return { mensaje: 'email-enviado' }
  }

  private emitirAccessToken(usuario: any): string {
    return this.jwtService.sign(
      {
        sub: usuario._id.toString(),
        rol: usuario.rol,
        verificacionEstado: usuario.verificacionEstado,
        administracion: usuario.administracion,
        tipo: 'access',
      },
      { secret: this.jwtAccessSecret, expiresIn: this.accessExpiresIn as any },
    )
  }

  private async emitirRefreshToken(usuarioId: string, familiaId: string): Promise<string> {
    const jti = randomUUID()
    const token = this.jwtService.sign(
      { sub: usuarioId, jti, familiaId, tipo: 'refresh' },
      { secret: this.jwtRefreshSecret, expiresIn: this.refreshExpiresIn as any },
    )

    await this.refreshTokenRepo.save({
      jti,
      usuarioId,
      familiaId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    return token
  }

  private emitirTokenVerificacionEmail(userId: string): string {
    return this.jwtService.sign(
      { sub: userId, tipo: 'email-verify' },
      { secret: this.jwtAccessSecret, expiresIn: `${this.emailVerificationTtlHours}h` as any },
    )
  }

  private usuarioPublico(usuario: any): UsuarioPublico {
    return {
      id: usuario._id?.toString() || usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      telefono: usuario.telefono,
      verificacionEstado: usuario.verificacionEstado,
      administracion: usuario.administracion,
      emailVerificado: usuario.emailVerificado ?? false,
    }
  }
}

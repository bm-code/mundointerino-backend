import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { InjectRepository } from '@nestjs/typeorm'
import { JwtService } from '@nestjs/jwt'
import { Model } from 'mongoose'
import { Repository } from 'typeorm'
import { Response } from 'express'
import { randomUUID } from 'crypto'
import { UsuarioDocument } from '../usuarios/schemas/usuario.schema'
import { ImpersonationAuditEntity } from '../../database/entities/impersonation-audit.entity'
import { RefreshTokenEntity } from '../../database/entities/refresh-token.entity'
import { setAuthCookies, getCookieConfig, CookieConfig } from '../auth/cookies.util'

@Injectable()
export class AdminService {
  private readonly jwtAccessSecret: string
  private readonly jwtRefreshSecret: string
  private readonly accessExpiresIn: string
  private readonly refreshExpiresIn: string
  private readonly cookieConfig: CookieConfig

  constructor(
    @InjectModel('Usuario') private usuarioModel: Model<UsuarioDocument>,
    @InjectRepository(ImpersonationAuditEntity) private auditRepo: Repository<ImpersonationAuditEntity>,
    @InjectRepository(RefreshTokenEntity) private refreshTokenRepo: Repository<RefreshTokenEntity>,
    private readonly jwtService: JwtService,
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
  }

  async getStats() {
    const [
      total,
      docentes,
      propietarios,
      admins,
      pendientes,
      verificados,
      rechazados,
      usuariosRecientes,
      ultimosRegistrados,
    ] = await Promise.all([
      this.usuarioModel.countDocuments(),
      this.usuarioModel.countDocuments({ rol: 'docente' }),
      this.usuarioModel.countDocuments({ rol: 'propietario' }),
      this.usuarioModel.countDocuments({ rol: 'admin' }),
      this.usuarioModel.countDocuments({ verificacionEstado: 'pendiente' }),
      this.usuarioModel.countDocuments({ verificacionEstado: 'verificado' }),
      this.usuarioModel.countDocuments({ verificacionEstado: 'rechazado' }),
      this.usuarioModel.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
      this.usuarioModel
        .find()
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ])

    return {
      usuarios: {
        total,
        porRol: { docente: docentes, propietario: propietarios, admin: admins },
        pendientes,
        verificados,
        rechazados,
        nuevosUltimoMes: usuariosRecientes,
      },
      ultimosRegistrados,
    }
  }

  async getUsuarios(page = 1, limit = 20, filtro?: string, search?: string) {
    const query: any = {}

    if (filtro && filtro !== 'todos') {
      if (['pendiente', 'verificado', 'rechazado', 'procesando', 'pendiente-revision-manual'].includes(filtro)) {
        query.verificacionEstado = filtro
      } else if (['docente', 'propietario', 'admin'].includes(filtro)) {
        query.rol = filtro
      }
    }

    if (search) {
      const regex = new RegExp(search, 'i')
      query.$or = [{ nombre: regex }, { email: regex }]
    }

    const [usuarios, total] = await Promise.all([
      this.usuarioModel
        .find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.usuarioModel.countDocuments(query),
    ])

    return { usuarios, total, pagina: page, totalPaginas: Math.ceil(total / limit) }
  }

  async updateUsuario(id: string, data: { rol?: string; verificacionEstado?: string; motivoRechazo?: string }) {
    const update: any = {}

    if (data.rol && ['docente', 'propietario', 'admin'].includes(data.rol)) {
      update.rol = data.rol
    }

    const estadosValidos = ['pendiente', 'verificado', 'rechazado', 'procesando', 'pendiente-revision-manual']
    if (data.verificacionEstado && estadosValidos.includes(data.verificacionEstado)) {
      update.verificacionEstado = data.verificacionEstado
      update.motivoRechazo = data.verificacionEstado === 'rechazado' ? data.motivoRechazo || '' : ''
    }

    return this.usuarioModel
      .findByIdAndUpdate(id, update, { new: true })
      .select('-password')
      .lean()
  }

  async impersonate(adminId: string, targetId: string, isImpersonating: boolean, res: Response) {
    if (adminId === targetId) {
      throw new BadRequestException('No puedes suplantarte a ti mismo')
    }

    if (isImpersonating) {
      throw new ForbiddenException('No puedes impersonar mientras ya estás impersonando')
    }

    const target = await this.usuarioModel.findById(targetId).select('-password').lean()
    if (!target) throw new NotFoundException('Usuario no encontrado')

    const activeAudit = await this.auditRepo.findOne({ where: { adminId, status: 'active' } })
    if (activeAudit) {
      throw new ForbiddenException('Ya tienes una sesión de impersonación activa')
    }

    const accessToken = this.jwtService.sign(
      {
        sub: target._id.toString(),
        rol: target.rol,
        verificacionEstado: target.verificacionEstado,
        administracion: target.administracion,
        tipo: 'access',
        impersonatingUserId: adminId,
      },
      { secret: this.jwtAccessSecret, expiresIn: this.accessExpiresIn as any },
    )

    const familiaId = randomUUID()
    const jti = randomUUID()
    const refreshToken = this.jwtService.sign(
      {
        sub: target._id.toString(),
        jti,
        familiaId,
        tipo: 'refresh',
        impersonatingUserId: adminId,
      },
      { secret: this.jwtRefreshSecret, expiresIn: this.refreshExpiresIn as any },
    )

    await this.refreshTokenRepo.save({
      jti,
      usuarioId: target._id.toString(),
      familiaId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    await this.auditRepo.save({
      adminId,
      targetId: target._id.toString(),
      startedAt: new Date(),
      status: 'active',
    })

    setAuthCookies(res, { accessToken, refreshToken }, this.cookieConfig)

    return {
      usuario: {
        id: target._id,
        nombre: target.nombre,
        email: target.email,
        rol: target.rol,
        telefono: target.telefono,
        verificacionEstado: target.verificacionEstado,
        administracion: target.administracion,
        emailVerificado: target.emailVerificado ?? false,
      },
    }
  }

  async endImpersonation(impersonatingUserId: string, res: Response) {
    const admin = await this.usuarioModel.findById(impersonatingUserId).select('-password').lean()
    if (!admin) throw new NotFoundException('Admin no encontrado')

    const activeAudit = await this.auditRepo.findOne({
      where: { adminId: impersonatingUserId, status: 'active' },
    })

    if (activeAudit) {
      const startedAt = activeAudit.startedAt
      await this.auditRepo.update(
        { id: activeAudit.id },
        {
          endedAt: new Date(),
          status: 'ended',
          endReason: 'manual',
          durationMs: Date.now() - startedAt.getTime(),
        },
      )
    }

    const accessToken = this.jwtService.sign(
      {
        sub: admin._id.toString(),
        rol: admin.rol,
        verificacionEstado: admin.verificacionEstado,
        administracion: admin.administracion,
        tipo: 'access',
      },
      { secret: this.jwtAccessSecret, expiresIn: this.accessExpiresIn as any },
    )

    const familiaId = randomUUID()
    const jti = randomUUID()
    const refreshToken = this.jwtService.sign(
      { sub: admin._id.toString(), jti, familiaId, tipo: 'refresh' },
      { secret: this.jwtRefreshSecret, expiresIn: this.refreshExpiresIn as any },
    )

    await this.refreshTokenRepo.save({
      jti,
      usuarioId: admin._id.toString(),
      familiaId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    setAuthCookies(res, { accessToken, refreshToken }, this.cookieConfig)

    return {
      usuario: {
        id: admin._id,
        nombre: admin.nombre,
        email: admin.email,
        rol: admin.rol,
        telefono: admin.telefono,
        verificacionEstado: admin.verificacionEstado,
        administracion: admin.administracion,
        emailVerificado: admin.emailVerificado ?? false,
      },
    }
  }
}

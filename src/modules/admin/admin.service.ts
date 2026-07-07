import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { JwtService } from '@nestjs/jwt'
import { Repository, Not, Like, MoreThanOrEqual } from 'typeorm'
import { Response } from 'express'
import { randomUUID } from 'crypto'
import { UsuarioEntity } from '../../database/entities/usuario.entity'
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
    @InjectRepository(UsuarioEntity) private usuarioRepo: Repository<UsuarioEntity>,
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
      this.usuarioRepo.count(),
      this.usuarioRepo.count({ where: { rol: 'docente' } }),
      this.usuarioRepo.count({ where: { rol: 'propietario' } }),
      this.usuarioRepo.count({ where: { rol: 'admin' } }),
      this.usuarioRepo.count({ where: { verificacionEstado: 'pendiente' } }),
      this.usuarioRepo.count({ where: { verificacionEstado: 'verificado' } }),
      this.usuarioRepo.count({ where: { verificacionEstado: 'rechazado' } }),
      this.usuarioRepo.count({
        where: { createdAt: MoreThanOrEqual(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) },
      }),
      this.usuarioRepo.find({
        select: { id: true, nombre: true, email: true, rol: true, telefono: true, verificacionEstado: true, administracion: true, emailVerificado: true, createdAt: true },
        order: { createdAt: 'DESC' },
        take: 5,
      }),
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
    const baseWhere: any = {}

    if (filtro && filtro !== 'todos') {
      if (['pendiente', 'verificado', 'rechazado', 'procesando', 'pendiente-revision-manual'].includes(filtro)) {
        baseWhere.verificacionEstado = filtro
      } else if (['docente', 'propietario', 'admin'].includes(filtro)) {
        baseWhere.rol = filtro
      }
    }

    let where: any = baseWhere
    if (search) {
      where = [
        { ...baseWhere, nombre: Like('%' + search + '%') },
        { ...baseWhere, email: Like('%' + search + '%') },
      ]
    }

    const [usuarios, total] = await Promise.all([
      this.usuarioRepo.find({
        where,
        select: { id: true, nombre: true, email: true, rol: true, telefono: true, verificacionEstado: true, administracion: true, emailVerificado: true, createdAt: true, motivoRechazo: true },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.usuarioRepo.count({ where }),
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

    await this.usuarioRepo.update(id, update)
    return this.usuarioRepo.findOne({
      where: { id },
      select: { id: true, nombre: true, email: true, rol: true, telefono: true, verificacionEstado: true, administracion: true, emailVerificado: true, createdAt: true, motivoRechazo: true },
    })
  }

  async impersonate(adminId: string, targetId: string, isImpersonating: boolean, res: Response) {
    if (adminId === targetId) {
      throw new BadRequestException('No puedes suplantarte a ti mismo')
    }

    if (isImpersonating) {
      throw new ForbiddenException('No puedes impersonar mientras ya estás impersonando')
    }

    const target = await this.usuarioRepo.findOne({
      where: { id: targetId },
      select: { id: true, nombre: true, email: true, rol: true, telefono: true, verificacionEstado: true, administracion: true, emailVerificado: true },
    })
    if (!target) throw new NotFoundException('Usuario no encontrado')

    const activeAudit = await this.auditRepo.findOne({ where: { adminId, status: 'active' } })
    if (activeAudit) {
      throw new ForbiddenException('Ya tienes una sesión de impersonación activa')
    }

    const accessToken = this.jwtService.sign(
      {
        sub: target.id,
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
        sub: target.id,
        jti,
        familiaId,
        tipo: 'refresh',
        impersonatingUserId: adminId,
      },
      { secret: this.jwtRefreshSecret, expiresIn: this.refreshExpiresIn as any },
    )

    await this.refreshTokenRepo.save({
      jti,
      usuarioId: target.id,
      familiaId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    await this.auditRepo.save({
      adminId,
      targetId: target.id,
      startedAt: new Date(),
      status: 'active',
    })

    setAuthCookies(res, { accessToken, refreshToken }, this.cookieConfig)

    return {
      usuario: {
        id: target.id,
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
    const admin = await this.usuarioRepo.findOne({
      where: { id: impersonatingUserId },
      select: { id: true, nombre: true, email: true, rol: true, telefono: true, verificacionEstado: true, administracion: true, emailVerificado: true },
    })
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
        sub: admin.id,
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
      { sub: admin.id, jti, familiaId, tipo: 'refresh' },
      { secret: this.jwtRefreshSecret, expiresIn: this.refreshExpiresIn as any },
    )

    await this.refreshTokenRepo.save({
      jti,
      usuarioId: admin.id,
      familiaId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    setAuthCookies(res, { accessToken, refreshToken }, this.cookieConfig)

    return {
      usuario: {
        id: admin.id,
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

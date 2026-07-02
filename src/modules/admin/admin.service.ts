import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { JwtService } from '@nestjs/jwt'
import { Model } from 'mongoose'
import { UsuarioDocument } from '../usuarios/schemas/usuario.schema'

@Injectable()
export class AdminService {
  constructor(
    @InjectModel('Usuario') private usuarioModel: Model<UsuarioDocument>,
    private readonly jwtService: JwtService,
  ) {}

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
      if (['pendiente', 'verificado', 'rechazado'].includes(filtro)) {
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

    if (data.verificacionEstado && ['pendiente', 'verificado', 'rechazado'].includes(data.verificacionEstado)) {
      update.verificacionEstado = data.verificacionEstado
      update.motivoRechazo = data.verificacionEstado === 'rechazado' ? data.motivoRechazo || '' : ''
    }

    return this.usuarioModel
      .findByIdAndUpdate(id, update, { new: true })
      .select('-password')
      .lean()
  }

  async impersonate(adminId: string, targetId: string) {
    const target = await this.usuarioModel.findById(targetId).select('-password').lean()
    if (!target) throw new NotFoundException('Usuario no encontrado')

    if (target.rol === 'admin') {
      throw new ForbiddenException('No puedes suplantar a otro administrador')
    }

    const payload = {
      id: target._id,
      rol: target.rol,
      verificacionEstado: target.verificacionEstado,
      administracion: target.administracion,
    }

    const token = this.jwtService.sign(payload)

    return {
      token,
      usuario: {
        id: target._id,
        nombre: target.nombre,
        email: target.email,
        rol: target.rol,
        telefono: target.telefono,
        verificacionEstado: target.verificacionEstado,
        administracion: target.administracion,
      },
    }
  }
}

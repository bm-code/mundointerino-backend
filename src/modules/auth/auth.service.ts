import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import * as bcrypt from 'bcryptjs'
import { Usuario } from '../usuarios/schemas/usuario.schema'
import { RegistroDto } from './dto/registro.dto'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Usuario.name) private usuarioModel: Model<Usuario>,
    private jwtService: JwtService,
  ) {}

  async registro(dto: RegistroDto) {
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
    })

    const token = this.generarToken(usuario)

    return {
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        telefono: usuario.telefono,
        verificacionEstado: usuario.verificacionEstado,
        administracion: usuario.administracion,
      },
    }
  }

  async login(dto: LoginDto) {
    if (!dto.email || !dto.password) {
      throw new BadRequestException('Faltan credenciales')
    }

    const usuario = await this.usuarioModel.findOne({
      email: dto.email.toLowerCase().trim(),
    })

    if (!usuario) throw new UnauthorizedException('Credenciales incorrectas')

    const passwordValida = await bcrypt.compare(dto.password, usuario.password)
    if (!passwordValida) throw new UnauthorizedException('Credenciales incorrectas')

    const token = this.generarToken(usuario)

    return {
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        telefono: usuario.telefono,
        verificacionEstado: usuario.verificacionEstado,
        administracion: usuario.administracion,
      },
    }
  }

  private generarToken(usuario: any) {
    const payload = {
      id: usuario._id,
      rol: usuario.rol,
      verificacionEstado: usuario.verificacionEstado,
      administracion: usuario.administracion,
    }
    return this.jwtService.sign(payload)
  }
}

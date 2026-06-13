import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Usuario } from '../../usuarios/schemas/usuario.schema'

export interface JwtPayload {
  id: string
  rol: string
  administracion?: string
  verificacionEstado?: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectModel(Usuario.name) private usuarioModel: Model<Usuario>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    })
  }

  async validate(payload: JwtPayload) {
    const usuario = await this.usuarioModel.findById(payload.id).select('-password').lean()
    if (!usuario) throw new UnauthorizedException('Usuario no encontrado')
    return usuario
  }
}

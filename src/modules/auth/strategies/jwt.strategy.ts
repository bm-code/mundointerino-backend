import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Request } from 'express'
import { Usuario, UsuarioDocument } from '../../usuarios/schemas/usuario.schema'

export interface JwtPayload {
  sub: string
  rol: string
  administracion?: string
  verificacionEstado?: string
  tipo: string
  impersonatingUserId?: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
  ) {
    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET no está configurado en las variables de entorno')
    }
    super({
      jwtFromRequest: (req: Request) => req?.cookies?.['access_token'] || null,
      ignoreExpiration: false,
      secretOrKey: secret,
    })
  }

  async validate(payload: JwtPayload): Promise<any> {
    if (payload.tipo !== 'access') {
      throw new UnauthorizedException('Tipo de token no válido para sesión')
    }

    const usuario = await this.usuarioModel
      .findById(payload.sub)
      .select('-password')
      .lean()

    if (!usuario) throw new UnauthorizedException('Usuario no encontrado')

    return {
      ...usuario,
      isImpersonating: !!payload.impersonatingUserId,
      impersonatingUserId: payload.impersonatingUserId || null,
    }
  }
}

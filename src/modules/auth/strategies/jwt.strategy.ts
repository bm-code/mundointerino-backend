import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Request } from 'express'
import { UsuarioEntity } from '../../../database/entities/usuario.entity'

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
    @InjectRepository(UsuarioEntity) private usuarioRepo: Repository<UsuarioEntity>,
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

    const usuario = await this.usuarioRepo.findOne({
      where: { id: payload.sub },
    })

    if (!usuario) throw new UnauthorizedException('Usuario no encontrado')
    const { password, ...result } = usuario

    return {
      ...result,
      isImpersonating: !!payload.impersonatingUserId,
      impersonatingUserId: payload.impersonatingUserId || null,
    }
  }
}

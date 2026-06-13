import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ADMINISTRACION_KEY } from '../decorators/administracion.decorator'

@Injectable()
export class AdministracionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ADMINISTRACION_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required) return true

    const { user } = context.switchToHttp().getRequest()

    if (user.verificacionEstado !== 'verificado') {
      throw new ForbiddenException('Tu cuenta aún no está verificada')
    }

    if (!required.includes(user.administracion)) {
      throw new ForbiddenException('Acceso restringido a tu administración')
    }

    return true
  }
}

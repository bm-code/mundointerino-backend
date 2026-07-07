import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { REQUIRE_EMAIL_VERIFIED_KEY } from '../decorators/require-email-verified.decorator'

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_EMAIL_VERIFIED_KEY,
      [context.getHandler(), context.getClass()],
    )
    if (!required) return true

    const { user } = context.switchToHttp().getRequest()
    if (!user?.emailVerificado) {
      throw new ForbiddenException('Debes verificar tu email para realizar esta acción')
    }
    return true
  }
}

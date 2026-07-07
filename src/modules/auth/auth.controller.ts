import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { RegistroDto } from './dto/registro.dto'
import { LoginDto } from './dto/login.dto'
import { ReenviarVerificacionDto } from './dto/reenviar-verificacion.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('password-requirements')
  passwordRequirements() {
    return {
      requisitos: [
        { clave: 'minLength', etiqueta: 'Al menos 8 caracteres', regex: '.{8,}' },
        { clave: 'uppercase', etiqueta: 'Al menos una mayúscula', regex: '[A-Z]' },
        { clave: 'lowercase', etiqueta: 'Al menos una minúscula', regex: '[a-z]' },
        { clave: 'number', etiqueta: 'Al menos un número', regex: '[0-9]' },
        {
          clave: 'special',
          etiqueta: 'Al menos un carácter especial (!@#$%^&*()_+-=[]{}|,.<>/?)',
          regex: '[^A-Za-z0-9]',
        },
      ],
      fortalezaMinima: 4,
    }
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('registro')
  @HttpCode(HttpStatus.ACCEPTED)
  registro(@Body() dto: RegistroDto) {
    return this.authService.registro(dto)
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.refresh(req, res)
    res.status(HttpStatus.OK).send()
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() usuario: any) {
    return this.authService.me(usuario)
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req, res)
  }

  @Get('verificar-email')
  async verificarEmail(
    @Query('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!token) {
      return { error: 'Token no proporcionado' }
    }
    return this.authService.verificarEmail(token, res)
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('reenviar-verificacion-email')
  @HttpCode(HttpStatus.ACCEPTED)
  reenviarVerificacion(@Body() dto: ReenviarVerificacionDto) {
    return this.authService.reenviarVerificacion(dto)
  }
}

import { Controller, Post, Get, Body } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { RegistroDto } from './dto/registro.dto'
import { LoginDto } from './dto/login.dto'

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
  registro(@Body() dto: RegistroDto) {
    return this.authService.registro(dto)
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }
}

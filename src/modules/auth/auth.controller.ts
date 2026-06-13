import { Controller, Post, Body } from '@nestjs/common'
import { AuthService } from './auth.service'
import { RegistroDto } from './dto/registro.dto'
import { LoginDto } from './dto/login.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('registro')
  registro(@Body() dto: RegistroDto) {
    return this.authService.registro(dto)
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }
}

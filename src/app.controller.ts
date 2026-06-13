import { Controller, Get } from '@nestjs/common'

@Controller()
export class AppController {
  @Get()
  root() {
    return { mensaje: '✅ API Mundointerino funcionando correctamente' }
  }

  @Get('api/health')
  health() {
    return { status: 'OK' }
  }
}

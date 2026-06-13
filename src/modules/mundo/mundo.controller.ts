import { Controller, Get, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { AdministracionGuard } from '../../common/guards/administracion.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { Administracion } from '../../common/decorators/administracion.decorator'

@Controller('mundo')
@UseGuards(JwtAuthGuard)
export class MundoController {
  @Get()
  root() {
    return { mensaje: '🌍 Bienvenido al Espacio Mundo' }
  }

  @Get('educacion')
  @UseGuards(AdministracionGuard)
  @Administracion('educacion')
  educacion() {
    return { mensaje: '📚 Foro de Educación', administracion: 'educacion' }
  }

  @Get('sanidad')
  @UseGuards(AdministracionGuard)
  @Administracion('sanidad')
  sanidad() {
    return { mensaje: '🏥 Foro de Sanidad', administracion: 'sanidad' }
  }

  @Get('justicia')
  @UseGuards(AdministracionGuard)
  @Administracion('justicia')
  justicia() {
    return { mensaje: '⚖️ Foro de Justicia', administracion: 'justicia' }
  }

  @Get('otros')
  @UseGuards(AdministracionGuard)
  @Administracion('otros')
  otros() {
    return { mensaje: '🏛️ Foro Otros sectores', administracion: 'otros' }
  }

  @Get('grupos')
  grupos() {
    return { mensaje: '📲 Grupos por zona' }
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles('admin')
  admin() {
    return { mensaje: '🔧 Panel admin del Espacio Mundo' }
  }
}

import { Controller, Get, Query, Param } from '@nestjs/common'
import { CiudadesService } from './ciudades.service'

@Controller()
export class CiudadesController {
  constructor(private readonly ciudadesService: CiudadesService) {}

  @Get('comunidades')
  comunidades() {
    return this.ciudadesService.listarComunidades()
  }

  @Get('provincias')
  provincias(@Query('comunidad') comunidad?: string) {
    return this.ciudadesService.listarProvincias(comunidad)
  }

  @Get('ciudades')
  ciudades(@Query('q') q?: string, @Query('comunidad') comunidad?: string, @Query('provincia') provincia?: string, @Query('limit') limit?: string) {
    return this.ciudadesService.buscar(q, comunidad, provincia, Number(limit) || 20)
  }

  @Get('ciudades/:slug')
  ciudadPorSlug(@Param('slug') slug: string) {
    return this.ciudadesService.porSlug(slug)
  }
}

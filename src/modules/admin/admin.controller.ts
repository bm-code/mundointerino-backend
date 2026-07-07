import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { Response } from 'express'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AdminService } from './admin.service'

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats()
  }

  @Get('usuarios')
  getUsuarios(
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
    @Query('filtro') filtro?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsuarios(
      Number(pagina) || 1,
      Number(limite) || 20,
      filtro,
      search,
    )
  }

  @Patch('usuarios/:id')
  updateUsuario(
    @Param('id') id: string,
    @Body() body: { rol?: string; verificacionEstado?: string; motivoRechazo?: string },
  ) {
    return this.adminService.updateUsuario(id, body)
  }

  @Post('usuarios/:id/impersonate')
  impersonate(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('isImpersonating') isImpersonating: boolean,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.adminService.impersonate(adminId.toString(), id, isImpersonating, res)
  }

  @Post('end-impersonation')
  @HttpCode(HttpStatus.OK)
  endImpersonation(
    @CurrentUser('impersonatingUserId') impersonatingUserId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!impersonatingUserId) {
      return { error: 'No estás impersonando a nadie' }
    }
    return this.adminService.endImpersonation(impersonatingUserId, res)
  }
}

import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { UsuariosService } from './usuarios.service'
import { UpdateUsuarioDto } from './dto/update-usuario.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { VerificacionDto } from './dto/verificacion.dto'
import { VerificarUsuarioDto } from './dto/verificar-usuario.dto'
import { UploadService } from '../cloudinary/cloudinary.service'
import { verificationStorage } from '../cloudinary/cloudinary-storage'

@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly uploadService: UploadService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser('id') userId: string) {
    return this.usuariosService.getProfile(userId)
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateUsuarioDto) {
    return this.usuariosService.updateProfile(userId, dto)
  }

  @Put('me/password')
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    return this.usuariosService.changePassword(userId, dto)
  }

  @Post('verificacion-docente')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('documento', {
      storage: verificationStorage,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadVerificacion(
    @CurrentUser('id') userId: string,
    @CurrentUser('nombre') userName: string,
    @Body() dto: VerificacionDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Debes adjuntar un documento')

    const urlDocumento = await this.uploadService.uploadDocument(file)

    const usuario = await this.usuariosService.uploadVerificacion(
      userId,
      dto.tipoDocumento,
      dto.administracion,
      urlDocumento,
      userName || '',
    )

    return {
      mensaje: 'Documentación enviada. Verificando automáticamente...',
      usuario,
    }
  }

  @Delete('documento')
  @UseGuards(JwtAuthGuard)
  async deleteDocumento(@CurrentUser('id') userId: string) {
    await this.usuariosService.deleteDocumento(userId)
    return { mensaje: 'Documento eliminado correctamente' }
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAll() {
    return this.usuariosService.findAll()
  }

  @Patch(':id/verificar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  verificar(@Param('id') id: string, @Body() dto: VerificarUsuarioDto) {
    return this.usuariosService.verificar(id, dto.estado, dto.motivoRechazo)
  }

  @Post(':id/re-verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  reverify(@Param('id') id: string) {
    return this.usuariosService.reverify(id)
  }

  @Patch(':id/reset-upload-limit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  resetUploadLimit(@Param('id') id: string) {
    return this.usuariosService.resetUploadLimit(id)
  }
}

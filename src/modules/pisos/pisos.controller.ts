import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard'
import { RequireEmailVerified } from '../../common/decorators/require-email-verified.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { PisosService } from './pisos.service'
import { CreatePisoDto } from './dto/create-piso.dto'
import { UpdatePisoDto } from './dto/update-piso.dto'
import { QueryPisoDto } from './dto/query-piso.dto'

@Controller('pisos')
export class PisosController {
  constructor(private readonly pisosService: PisosService) {}

  @Get()
  findAll(@Query() query: QueryPisoDto) {
    return this.pisosService.findAll(query)
  }

  @Get('mis-pisos')
  @UseGuards(JwtAuthGuard)
  misPisos(@CurrentUser('id') userId: string) {
    return this.pisosService.misPisos(userId)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pisosService.findOne(id)
  }

  @Post()
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @RequireEmailVerified()
  @UseInterceptors(FilesInterceptor('imagenes', 8))
  async create(
    @Body() dto: CreatePisoDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser('id') userId: string,
  ) {
    return this.pisosService.create(dto, files, userId)
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @RequireEmailVerified()
  @UseInterceptors(FilesInterceptor('imagenes', 8))
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser('id') userId: string,
  ) {
    const { activo, fotosActuales, ...rest } = body
    return this.pisosService.update(id, { ...rest, activoRaw: activo, fotosActuales }, files, userId)
  }

  @Patch(':id/disponibilidad')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @RequireEmailVerified()
  toggleDisponibilidad(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.pisosService.toggleDisponibilidad(id, userId)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @RequireEmailVerified()
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.pisosService.remove(id, userId)
  }
}

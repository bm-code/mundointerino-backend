import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { AnunciosService } from './anuncios.service'
import { CreateAnuncioDto } from './dto/create-anuncio.dto'
import { UpdateAnuncioDto } from './dto/update-anuncio.dto'
import { QueryAnuncioDto } from './dto/query-anuncio.dto'

@Controller('anuncios')
export class AnunciosController {
  constructor(private readonly anunciosService: AnunciosService) {}

  @Get()
  findAll(@Query() query: QueryAnuncioDto) {
    return this.anunciosService.findAll(query)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.anunciosService.findOne(id)
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateAnuncioDto) {
    return this.anunciosService.create(dto)
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateAnuncioDto) {
    return this.anunciosService.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.anunciosService.remove(id)
  }
}

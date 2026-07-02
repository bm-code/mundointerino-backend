import { IsString, IsOptional, IsIn, IsBoolean, IsDateString, MaxLength } from 'class-validator'
import { Transform } from 'class-transformer'

export class UpdateAnuncioDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titulo?: string

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descripcion?: string

  @IsOptional()
  @IsIn(['educacion', 'sanidad', 'justicia', 'otros'])
  administracion?: string

  @IsOptional()
  @IsIn(['anuncio', 'convocatoria', 'aviso', 'recurso'])
  tipo?: string

  @IsOptional()
  @IsString()
  url?: string

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  activo?: boolean

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  destacado?: boolean

  @IsOptional()
  @IsDateString()
  fechaExpiracion?: string
}

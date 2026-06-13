import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  Min,
  MaxLength,
} from 'class-validator'

export class CreatePisoDto {
  @IsString()
  @MaxLength(100)
  titulo: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string

  @IsString()
  ciudad: string

  @IsOptional()
  @IsString()
  barrio?: string

  @IsOptional()
  @IsString()
  contacto?: string

  @IsNumber()
  @Min(0)
  precio: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioDia?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  fianza?: number

  @IsNumber()
  @Min(1)
  habitaciones: number

  @IsOptional()
  @IsNumber()
  @Min(1)
  banos?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  metros?: number

  @IsOptional()
  @IsString()
  planta?: string

  @IsIn(['corta', 'larga', 'ambas'])
  tipoEstancia: string

  @IsOptional()
  @IsDateString()
  disponible?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  servicios?: string[]

  @IsOptional()
  @IsString()
  comunidad?: string

  @IsOptional()
  @IsString()
  provincia?: string
}

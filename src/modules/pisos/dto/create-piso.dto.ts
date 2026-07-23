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
import { Type } from 'class-transformer'

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

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioDia?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fianza?: number

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  habitaciones: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  banos?: number

  @IsOptional()
  @Type(() => Number)
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

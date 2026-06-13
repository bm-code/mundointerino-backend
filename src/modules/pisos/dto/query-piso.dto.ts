import { IsOptional, IsString, IsNumber, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class QueryPisoDto {
  @IsOptional()
  @IsString()
  comunidad?: string

  @IsOptional()
  @IsString()
  provincia?: string

  @IsOptional()
  @IsString()
  ciudad?: string

  @IsOptional()
  @IsString()
  tipo?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioMax?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  habitaciones?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pagina?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limite?: number
}

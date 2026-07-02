import { IsOptional, IsString, IsNumber, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class QueryAnuncioDto {
  @IsOptional()
  @IsString()
  administracion?: string

  @IsOptional()
  @IsString()
  tipo?: string

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

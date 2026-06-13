import { IsString, IsIn, IsOptional } from 'class-validator'

export class VerificarUsuarioDto {
  @IsString()
  @IsIn(['verificado', 'rechazado', 'pendiente'])
  estado: string

  @IsOptional()
  @IsString()
  motivoRechazo?: string
}

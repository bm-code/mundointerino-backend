import { IsString, IsIn, IsOptional } from 'class-validator'

export class VerificarUsuarioDto {
  @IsString()
  @IsIn(['pendiente', 'procesando', 'verificado', 'rechazado', 'pendiente-revision-manual'])
  estado: string

  @IsOptional()
  @IsString()
  motivoRechazo?: string
}
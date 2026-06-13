import { IsString, IsIn } from 'class-validator'

export class VerificacionDto {
  @IsString()
  @IsIn(['nomina', 'nombramiento', 'credencial', 'contrato'])
  tipoDocumento: string

  @IsString()
  @IsIn(['educacion', 'sanidad', 'justicia', 'otros'])
  administracion: string
}

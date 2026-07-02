import { IsString, IsIn } from 'class-validator'

export class VerificacionDto {
  @IsString()
  @IsIn(['nomina', 'nombramiento', 'credencial', 'contrato', 'certificado_servicios', 'resolucion'])
  tipoDocumento: string

  @IsString()
  @IsIn(['educacion', 'sanidad', 'justicia', 'otros'])
  administracion: string
}

import { IsEmail, IsString, MinLength, IsOptional, IsIn } from 'class-validator'

export class RegistroDto {
  @IsString()
  @MinLength(2)
  nombre: string

  @IsEmail()
  email: string

  @IsString()
  @MinLength(6)
  password: string

  @IsIn(['docente', 'propietario'])
  rol: 'docente' | 'propietario'

  @IsOptional()
  @IsString()
  telefono?: string
}

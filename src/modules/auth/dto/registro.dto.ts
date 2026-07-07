import { IsEmail, IsString, MinLength, IsOptional, IsIn, Matches } from 'class-validator'

export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/

export class RegistroDto {
  @IsString()
  @MinLength(2)
  nombre: string

  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, {
    message:
      'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial',
  })
  password: string

  @IsIn(['docente', 'propietario'])
  rol: 'docente' | 'propietario'

  @IsOptional()
  @IsString()
  telefono?: string
}

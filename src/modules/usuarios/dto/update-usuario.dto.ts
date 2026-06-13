import { IsString, IsOptional, IsEmail } from 'class-validator'

export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  nombre?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  telefono?: string
}

import { IsString, MinLength } from 'class-validator'

export class ChangePasswordDto {
  @IsString()
  passwordActual: string

  @IsString()
  @MinLength(6)
  passwordNueva: string
}

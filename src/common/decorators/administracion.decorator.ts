import { SetMetadata } from '@nestjs/common'

export const ADMINISTRACION_KEY = 'administraciones'
export const Administracion = (...administraciones: string[]) =>
  SetMetadata(ADMINISTRACION_KEY, administraciones)

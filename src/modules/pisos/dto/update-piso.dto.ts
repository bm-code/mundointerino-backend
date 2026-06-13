import { PartialType } from '@nestjs/mapped-types'
import { CreatePisoDto } from './create-piso.dto'

export class UpdatePisoDto extends PartialType(CreatePisoDto) {}

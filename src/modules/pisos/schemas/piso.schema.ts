import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Types, Document } from 'mongoose'

export type PisoDocument = Piso & Document

@Schema({ timestamps: true })
export class Piso {
  @Prop({ required: true, trim: true, maxlength: 100 })
  titulo: string

  @Prop({ trim: true, maxlength: 1000 })
  descripcion: string

  @Prop({ required: true, trim: true })
  ciudad: string

  @Prop({ default: null, index: true })
  ciudadSlug: string

  @Prop({ trim: true })
  barrio: string

  @Prop({ trim: true })
  contacto: string

  @Prop({ required: true, min: 0 })
  precio: number

  @Prop({ min: 0 })
  precioDia: number

  @Prop({ min: 0, default: 0 })
  fianza: number

  @Prop({ required: true, min: 1 })
  habitaciones: number

  @Prop({ min: 1 })
  banos: number

  @Prop({ min: 0 })
  metros: number

  @Prop({ trim: true })
  planta: string

  @Prop({ required: true, enum: ['corta', 'larga', 'ambas'] })
  tipoEstancia: string

  @Prop()
  disponible: Date

  @Prop({ type: [String], default: [] })
  servicios: string[]

  @Prop({ type: [String], default: [] })
  fotos: string[]

  @Prop({ default: true })
  activo: boolean

  @Prop({ default: '' })
  comunidad: string

  @Prop({ default: '' })
  provincia: string

  @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true })
  propietario: Types.ObjectId
}

export const PisoSchema = SchemaFactory.createForClass(Piso)

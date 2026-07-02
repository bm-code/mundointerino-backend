import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type AnuncioDocument = Anuncio & Document

@Schema({ timestamps: true })
export class Anuncio {
  @Prop({ required: true, trim: true, maxlength: 200 })
  titulo: string

  @Prop({ required: true, trim: true, maxlength: 5000 })
  descripcion: string

  @Prop({ required: true, enum: ['educacion', 'sanidad', 'justicia', 'otros'] })
  administracion: string

  @Prop({ required: true, enum: ['anuncio', 'convocatoria', 'aviso', 'recurso'] })
  tipo: string

  @Prop({ trim: true })
  url: string

  @Prop({ default: true })
  activo: boolean

  @Prop({ default: false })
  destacado: boolean

  @Prop({ type: Date, default: null })
  fechaExpiracion: Date
}

export const AnuncioSchema = SchemaFactory.createForClass(Anuncio)

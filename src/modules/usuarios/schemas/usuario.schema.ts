import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type UsuarioDocument = Usuario & Document

@Schema({ timestamps: true })
export class Usuario {
  @Prop({ required: true, trim: true })
  nombre: string

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string

  @Prop({ required: true, minlength: 6 })
  password: string

  @Prop({ required: true, enum: ['docente', 'propietario', 'admin'], default: 'docente' })
  rol: string

  @Prop({ default: '', trim: true })
  telefono: string

  @Prop({ enum: ['pendiente', 'verificado', 'rechazado'], default: 'pendiente' })
  verificacionEstado: string

  @Prop({ default: '' })
  motivoRechazo: string

  @Prop({ enum: ['nomina', 'nombramiento', 'credencial', 'contrato'], default: null })
  tipoDocumento: string

  @Prop({ enum: ['educacion', 'sanidad', 'justicia', 'otros'], default: null })
  administracion: string

  @Prop({ default: null })
  urlDocumento: string
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario)

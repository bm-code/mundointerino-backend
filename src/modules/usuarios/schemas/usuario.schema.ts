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

  @Prop({ enum: ['nomina', 'nombramiento', 'credencial', 'contrato', 'certificado_servicios', 'resolucion'], default: null })
  tipoDocumento: string

  @Prop({ enum: ['educacion', 'sanidad', 'justicia', 'otros'], default: null })
  administracion: string

  @Prop({ default: null })
  urlDocumento: string

  @Prop({ default: null })
  verificationConfidence: number

  @Prop({ default: '' })
  verificationNotes: string

  @Prop({ default: null })
  verificationDate: Date

  @Prop({ enum: ['automatic', 'manual'], default: null })
  verificationType: string

  @Prop({ default: null })
  ultimaSubidaDocumento: Date

  @Prop({ type: Boolean, default: false, index: true })
  emailVerificado: boolean

  @Prop({ enum: ['pendiente', 'verificado', 'expirado'], default: 'pendiente' })
  emailVerificacionEstado: string

  @Prop({ default: null })
  emailVerificacionTokenHash: string

  @Prop({ default: null })
  emailVerificacionExpira: Date

  @Prop({ type: Number, default: 0 })
  emailVerificacionIntentos: number

  @Prop({ default: null })
  ultimoReenvioVerificacion: Date

  @Prop({ default: null })
  emailVerificadoEn: Date

  @Prop({ default: null })
  verificationAttempts: number

  @Prop({ default: '' })
  verificationLastError: string

  @Prop({ default: null })
  verificationProvider: string

  @Prop({ default: null })
  verificationJobId: string
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario)

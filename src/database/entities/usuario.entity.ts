import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm'
import { PisoEntity } from './piso.entity'

@Entity('usuarios')
export class UsuarioEntity {
  @PrimaryColumn('varchar', { length: 24 })
  id: string

  @Column()
  nombre: string

  @Column({ unique: true })
  email: string

  @Column()
  password: string

  @Column({ default: 'docente' })
  rol: string

  @Column({ default: '' })
  telefono: string

  @Column({ default: 'pendiente' })
  verificacionEstado: string

  @Column({ default: '' })
  motivoRechazo: string

  @Column({ nullable: true })
  tipoDocumento: string

  @Column({ nullable: true })
  administracion: string

  @Column({ nullable: true })
  urlDocumento: string

  @Column({ type: 'float', nullable: true })
  verificationConfidence: number

  @Column({ default: '' })
  verificationNotes: string

  @Column({ nullable: true })
  verificationDate: Date

  @Column({ nullable: true })
  verificationType: string

  @Column({ nullable: true })
  ultimaSubidaDocumento: Date

  @Column({ default: false })
  emailVerificado: boolean

  @Column({ default: 'pendiente' })
  emailVerificacionEstado: string

  @Column({ nullable: true })
  emailVerificacionTokenHash: string

  @Column({ nullable: true })
  emailVerificacionExpira: Date

  @Column({ default: 0 })
  emailVerificacionIntentos: number

  @Column({ nullable: true })
  ultimoReenvioVerificacion: Date

  @Column({ nullable: true })
  emailVerificadoEn: Date

  @Column({ nullable: true })
  verificationAttempts: number

  @Column({ default: '' })
  verificationLastError: string

  @Column({ nullable: true })
  verificationProvider: string

  @Column({ nullable: true })
  verificationJobId: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToMany(() => PisoEntity, (piso) => piso.propietario)
  pisos: PisoEntity[]
}

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { UsuarioEntity } from './usuario.entity'

@Entity('pisos')
export class PisoEntity {
  @PrimaryColumn('varchar', { length: 24 })
  id: string

  @Column()
  titulo: string

  @Column({ default: '' })
  descripcion: string

  @Column()
  ciudad: string

  @Column({ nullable: true })
  ciudadSlug: string

  @Column({ default: '' })
  barrio: string

  @Column({ default: '' })
  contacto: string

  @Column({ type: 'float' })
  precio: number

  @Column({ type: 'float', nullable: true })
  precioDia: number

  @Column({ type: 'float', default: 0 })
  fianza: number

  @Column()
  habitaciones: number

  @Column({ nullable: true })
  banos: number

  @Column({ type: 'float', nullable: true })
  metros: number

  @Column({ default: '' })
  planta: string

  @Column()
  tipoEstancia: string

  @Column({ nullable: true })
  disponible: Date

  @Column('simple-array', { default: '' })
  servicios: string[]

  @Column('simple-array', { default: '' })
  fotos: string[]

  @Column({ default: true })
  activo: boolean

  @Column({ default: '' })
  comunidad: string

  @Column({ default: '' })
  provincia: string

  @Column({ type: 'float', nullable: true })
  lat: number

  @Column({ type: 'float', nullable: true })
  lng: number

  @ManyToOne(() => UsuarioEntity, (usuario) => usuario.pisos)
  @JoinColumn({ name: 'propietarioId' })
  propietario: UsuarioEntity

  @Column('varchar', { length: 24 })
  propietarioId: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

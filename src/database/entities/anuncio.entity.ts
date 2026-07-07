import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('anuncios')
export class AnuncioEntity {
  @PrimaryColumn('varchar', { length: 24 })
  id: string

  @Column()
  titulo: string

  @Column()
  descripcion: string

  @Column()
  administracion: string

  @Column()
  tipo: string

  @Column({ nullable: true })
  url: string

  @Column({ default: true })
  activo: boolean

  @Column({ default: false })
  destacado: boolean

  @Column({ nullable: true })
  fechaExpiracion: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

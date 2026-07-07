import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm'

@Entity('ciudades')
@Index(['comunidadSlug'])
@Index(['provinciaSlug'])
export class CiudadEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 150 })
  nombre: string

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 200 })
  slug: string

  @Column({ type: 'varchar', length: 150 })
  provinciaNombre: string

  @Column({ type: 'varchar', length: 200 })
  provinciaSlug: string

  @Column({ type: 'varchar', length: 10 })
  provinciaCodigoINE: string

  @Column({ type: 'varchar', length: 150 })
  comunidadNombre: string

  @Column({ type: 'varchar', length: 200 })
  comunidadSlug: string

  @Column({ type: 'varchar', length: 10 })
  comunidadCodigoINE: string

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 10 })
  codigoINE: string

  @Column({ type: 'float', nullable: true })
  lat: number | null

  @Column({ type: 'float', nullable: true })
  lng: number | null

  @CreateDateColumn()
  createdAt: Date
}

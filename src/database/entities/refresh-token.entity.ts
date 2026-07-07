import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

@Entity('refresh_tokens')
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index()
  @Column({ type: 'uuid', unique: true })
  jti: string

  @Index()
  @Column({ type: 'varchar', length: 64 })
  usuarioId: string

  @Index()
  @Column({ type: 'uuid' })
  familiaId: string

  @Column({ type: 'timestamp' })
  expiresAt: Date

  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null

  @Column({ type: 'uuid', nullable: true })
  replacedByToken: string | null

  @Column({ type: 'varchar', length: 255, default: '' })
  userAgent: string

  @Column({ type: 'varchar', length: 64, default: '' })
  ipAddress: string

  @CreateDateColumn()
  createdAt: Date
}

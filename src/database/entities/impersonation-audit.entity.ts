import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

@Entity('impersonation_audits')
export class ImpersonationAuditEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index()
  @Column({ type: 'varchar', length: 64 })
  adminId: string

  @Index()
  @Column({ type: 'varchar', length: 64 })
  targetId: string

  @Column({ type: 'timestamp' })
  startedAt: Date

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date | null

  @Column({ type: 'integer', default: 0 })
  durationMs: number

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string

  @Column({ type: 'varchar', length: 50, nullable: true })
  endReason: string | null

  @Column({ type: 'varchar', length: 64, default: '' })
  adminIp: string

  @Column({ type: 'varchar', length: 255, default: '' })
  adminUserAgent: string

  @CreateDateColumn()
  createdAt: Date
}

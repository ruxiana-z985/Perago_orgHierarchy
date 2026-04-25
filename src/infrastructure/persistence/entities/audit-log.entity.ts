import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditActionType } from '../../../domain/org-chart.enums';

@Entity({ name: 'audit_logs' })
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  changeRequestId: string;

  @Column({ type: 'uuid' })
  positionId: string;

  @Column({ type: 'enum', enum: AuditActionType })
  actionType: AuditActionType;

  @Column({ length: 160 })
  actorEmail: string;

  @Column({ length: 160 })
  actorName: string;

  @Column({ length: 160 })
  approverEmail: string;

  @Column({ length: 160 })
  approverName: string;

  @Column({ type: 'jsonb', nullable: true })
  oldValues: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  newValues: Record<string, unknown> | null;

  @Column({ type: 'timestamp' })
  executedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}

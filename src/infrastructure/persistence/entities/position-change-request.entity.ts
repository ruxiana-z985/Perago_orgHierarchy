import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChangeActionType, ChangeRequestStatus } from '../../../domain/org-chart.enums';

@Entity({ name: 'position_change_requests' })
export class PositionChangeRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ChangeActionType })
  actionType: ChangeActionType;

  @Column({ type: 'uuid', nullable: true })
  positionId: string | null;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ length: 160 })
  requesterEmail: string;

  @Column({ length: 160 })
  requesterName: string;

  @Column({ default: false })
  requesterConfirmed: boolean;

  @Column({ type: 'uuid', nullable: true })
  confirmationToken: string | null;

  @Column({ length: 160 })
  approverEmail: string;

  @Column({ type: 'uuid', nullable: true })
  approvalToken: string | null;

  @Column({
    type: 'enum',
    enum: ChangeRequestStatus,
    default: ChangeRequestStatus.PENDING_CONFIRMATION,
  })
  approvalStatus: ChangeRequestStatus;

  @Column({ length: 160, nullable: true })
  approvedByName: string | null;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  executedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp' })
  expiresAt: Date;
}

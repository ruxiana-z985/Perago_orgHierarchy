import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PositionStatus } from '../../../domain/org-chart.enums';

@Entity({ name: 'positions' })
@Index('IDX_positions_parent_name_active_unique', ['parentId', 'name'], {
  unique: true,
  where: `"status" = 'active'`,
})
export class PositionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => PositionEntity, (position) => position.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parentId' })
  parent?: PositionEntity | null;

  @OneToMany(() => PositionEntity, (position) => position.parent)
  children?: PositionEntity[];

  @Column({ type: 'text', default: '' })
  path: string;

  @Column({ type: 'int', default: 0 })
  depth: number;

  @Column({
    type: 'enum',
    enum: PositionStatus,
    default: PositionStatus.ACTIVE,
  })
  status: PositionStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

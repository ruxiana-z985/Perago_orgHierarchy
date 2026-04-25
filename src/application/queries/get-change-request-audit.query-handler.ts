import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChangeRequestStatus } from '../../domain/org-chart.enums';
import { AuditLogEntity } from '../../infrastructure/persistence/entities/audit-log.entity';
import { PositionChangeRequestEntity } from '../../infrastructure/persistence/entities/position-change-request.entity';

@Injectable()
export class GetChangeRequestAuditQueryHandler {
  constructor(
    @InjectRepository(PositionChangeRequestEntity)
    private readonly requestsRepository: Repository<PositionChangeRequestEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogsRepository: Repository<AuditLogEntity>,
  ) {}

  async execute(id: string) {
    const request = await this.requestsRepository.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException('Change request not found.');
    }

    const auditLog = await this.auditLogsRepository.findOne({
      where: { changeRequestId: id },
    });

    const timeline: Array<Record<string, unknown>> = [
      {
        event: 'submitted',
        timestamp: request.createdAt,
        actor: request.requesterEmail,
      },
    ];

    if (request.requesterConfirmed) {
      timeline.push({
        event: 'confirmed',
        timestamp: request.updatedAt,
        actor: request.requesterEmail,
      });
    }

    if (
      request.approvalStatus === ChangeRequestStatus.REJECTED &&
      request.approvedAt
    ) {
      timeline.push({
        event: 'rejected',
        timestamp: request.approvedAt,
        actor: request.approverEmail,
        approverName: request.approvedByName,
        details: {
          rejectionReason: request.rejectionReason,
        },
      });
    } else if (request.approvedAt) {
      timeline.push({
        event: 'approved',
        timestamp: request.approvedAt,
        actor: request.approverEmail,
        approverName: request.approvedByName,
      });
    }

    if (auditLog) {
      timeline.push({
        event: 'executed',
        timestamp: auditLog.executedAt,
        details: {
          oldValues: auditLog.oldValues,
          newValues: auditLog.newValues,
        },
      });
    }

    return {
      success: true,
      data: {
        requestId: request.id,
        timeline,
      },
    };
  }
}

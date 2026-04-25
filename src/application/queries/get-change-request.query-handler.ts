import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChangeActionType, ChangeRequestStatus, PositionStatus } from '../../domain/org-chart.enums';
import { PositionChangeRequestEntity } from '../../infrastructure/persistence/entities/position-change-request.entity';
import { PositionEntity } from '../../infrastructure/persistence/entities/position.entity';

@Injectable()
export class GetChangeRequestQueryHandler {
  constructor(
    @InjectRepository(PositionChangeRequestEntity)
    private readonly requestsRepository: Repository<PositionChangeRequestEntity>,
    @InjectRepository(PositionEntity)
    private readonly positionsRepository: Repository<PositionEntity>,
  ) {}

  async execute(id: string) {
    const request = await this.requestsRepository.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException('Change request not found.');
    }

    if (
      request.expiresAt < new Date() &&
      ![
        ChangeRequestStatus.EXECUTED,
        ChangeRequestStatus.REJECTED,
        ChangeRequestStatus.EXPIRED,
      ].includes(request.approvalStatus)
    ) {
      request.approvalStatus = ChangeRequestStatus.EXPIRED;
      request.confirmationToken = null;
      request.approvalToken = null;
      await this.requestsRepository.save(request);
    }

    const position = request.positionId
      ? await this.positionsRepository.findOne({ where: { id: request.positionId } })
      : null;

    let impact: Record<string, unknown> = {};
    if (request.actionType === ChangeActionType.DELETE && request.positionId) {
      const parent = position?.parentId
        ? await this.positionsRepository.findOne({
            where: { id: position.parentId, status: PositionStatus.ACTIVE },
          })
        : null;
      const children = await this.positionsRepository.find({
        where: { parentId: request.positionId, status: PositionStatus.ACTIVE },
        order: { name: 'ASC' },
      });
      impact = {
        childrenToReassign: children.map((child) => ({
          id: child.id,
          name: child.name,
          newParent: parent?.name ?? null,
        })),
      };
    }

    return {
      success: true,
      data: {
        requestId: request.id,
        actionType: request.actionType,
        status: request.approvalStatus,
        position: position
          ? {
              id: position.id,
              name: position.name,
              path: position.path,
            }
          : null,
        payload: request.payload,
        impact,
        requester: {
          name: request.requesterName,
          email: request.requesterEmail,
        },
        submittedAt: request.createdAt,
        expiresAt: request.expiresAt,
      },
    };
  }
}

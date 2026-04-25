import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  AuditActionType,
  ChangeActionType,
  ChangeRequestStatus,
  PositionStatus,
  ReassignmentStrategy,
} from '../../domain/org-chart.enums';
import { RequestLifecyclePolicy } from '../../domain/org-chart.policies';
import { ApprovalEmailService } from '../../infrastructure/mail/approval-email.service';
import { AuditLogEntity } from '../../infrastructure/persistence/entities/audit-log.entity';
import { PositionChangeRequestEntity } from '../../infrastructure/persistence/entities/position-change-request.entity';
import { PositionEntity } from '../../infrastructure/persistence/entities/position.entity';
import { SubmitChangeRequestCommandHandler } from './submit-change-request.command-handler';
import { OrgChartGraphService } from '../services/org-chart-graph.service';

@Injectable()
export class ApproveChangeRequestCommandHandler {
  constructor(
    @InjectRepository(PositionChangeRequestEntity)
    private readonly requestsRepository: Repository<PositionChangeRequestEntity>,
    @InjectRepository(PositionEntity)
    private readonly positionsRepository: Repository<PositionEntity>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly submitHandler: SubmitChangeRequestCommandHandler,
    private readonly graphService: OrgChartGraphService,
    private readonly emailService: ApprovalEmailService,
  ) {}

  async execute(id: string, token: string, approverName?: string) {
    const request = await this.requestsRepository.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException('Change request not found.');
    }

    if (this.applyExpiry(request)) {
      await this.requestsRepository.save(request);
    }

    this.wrapPolicyError(() =>
      RequestLifecyclePolicy.ensureApprovable(
        request.approvalStatus,
        request.expiresAt,
        request.approvalToken === token,
      ),
    );

    await this.submitHandler.validateCommand({
      actionType: request.actionType,
      positionId: request.positionId ?? undefined,
      payload: request.payload,
      requesterEmail: request.requesterEmail,
      requesterName: request.requesterName,
    });

    request.approvalStatus = ChangeRequestStatus.APPROVED;
    request.approvedAt = new Date();
    request.approvedByName = this.requireText(
      approverName ?? request.approverEmail.split('@')[0],
      'APPROVER_NAME_REQUIRED',
    );

    const result = await this.dataSource.transaction(async (manager) => {
      const positionsRepository = manager.getRepository(PositionEntity);
      const auditRepository = manager.getRepository(AuditLogEntity);
      let positionId = request.positionId ?? '';
      let oldValues: Record<string, unknown> | null = null;
      let newValues: Record<string, unknown> | null = null;

      if (request.actionType === ChangeActionType.CREATE) {
        const payload = request.payload;
        const position = positionsRepository.create({
          name: String(payload.name),
          description: String(payload.description),
          parentId: (payload.parentId as string | null | undefined) ?? null,
          path: '',
          depth: 0,
          status: PositionStatus.ACTIVE,
        });
        const savedPosition = await positionsRepository.save(position);
        positionId = savedPosition.id;
        await this.graphService.rebuildPaths(manager);
        const refreshed = await positionsRepository.findOneOrFail({
          where: { id: savedPosition.id },
        });
        newValues = this.snapshot(refreshed);
      }

      if (request.actionType === ChangeActionType.UPDATE) {
        const position = await positionsRepository.findOne({
          where: { id: request.positionId! },
        });
        if (!position) {
          throw new NotFoundException('Position not found.');
        }

        oldValues = this.snapshot(position);
        position.name = String(request.payload.name ?? position.name);
        position.description = String(
          request.payload.description ?? position.description,
        );
        position.parentId =
          request.payload.parentId === undefined
            ? position.parentId
            : (request.payload.parentId as string | null);
        await positionsRepository.save(position);
        await this.graphService.rebuildPaths(manager);
        const refreshed = await positionsRepository.findOneOrFail({
          where: { id: position.id },
        });
        positionId = refreshed.id;
        newValues = this.snapshot(refreshed);
      }

      if (request.actionType === ChangeActionType.DELETE) {
        const position = await positionsRepository.findOne({
          where: { id: request.positionId! },
        });
        if (!position) {
          throw new NotFoundException('Position not found.');
        }

        oldValues = this.snapshot(position);
        if (
          request.payload.reassignmentStrategy ===
          ReassignmentStrategy.PROMOTE_TO_PARENT
        ) {
          const children = await positionsRepository.find({
            where: { parentId: position.id, status: PositionStatus.ACTIVE },
          });
          for (const child of children) {
            child.parentId = position.parentId;
          }
          if (children.length > 0) {
            await positionsRepository.save(children);
          }
        }

        position.status = PositionStatus.INACTIVE;
        position.parentId = null;
        position.path = '';
        position.depth = 0;
        await positionsRepository.save(position);
        await this.graphService.rebuildPaths(manager);
        positionId = position.id;
        newValues = null;
      }

      await auditRepository.save(
        auditRepository.create({
          changeRequestId: request.id,
          positionId,
          actionType: this.auditType(request.actionType),
          actorEmail: request.requesterEmail,
          actorName: request.requesterName,
          approverEmail: request.approverEmail,
          approverName: request.approvedByName!,
          oldValues,
          newValues,
          executedAt: request.approvedAt!,
        }),
      );

      return { positionId };
    });

    request.approvalStatus = ChangeRequestStatus.EXECUTED;
    request.executedAt = request.approvedAt;
    request.approvalToken = null;
    const savedRequest = await this.requestsRepository.save(request);
    await this.emailService.sendRequesterOutcome(savedRequest, 'approved');

    return {
      success: true,
      data: {
        requestId: savedRequest.id,
        status: savedRequest.approvalStatus,
        message: 'Request approved and executed.',
        executedAt: savedRequest.executedAt,
        positionId: result.positionId,
        links: this.emailService.buildDebugLinks(savedRequest),
      },
    };
  }

  private applyExpiry(request: PositionChangeRequestEntity) {
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
      return true;
    }

    return false;
  }

  private requireText(value: string, code: string): string {
    if (!value || value.trim().length === 0) {
      throw new BadRequestException({
        code,
        message: 'Required text value is missing.',
      });
    }

    return value.trim();
  }

  private snapshot(position: PositionEntity) {
    return {
      id: position.id,
      name: position.name,
      description: position.description,
      parentId: position.parentId,
      path: position.path,
      depth: position.depth,
      status: position.status,
    };
  }

  private auditType(actionType: ChangeActionType): AuditActionType {
    if (actionType === ChangeActionType.CREATE) {
      return AuditActionType.CREATED;
    }

    if (actionType === ChangeActionType.UPDATE) {
      return AuditActionType.UPDATED;
    }

    return AuditActionType.DELETED;
  }

  private wrapPolicyError<T>(factory: () => T): T {
    try {
      return factory();
    } catch (error) {
      const code = error instanceof Error ? error.message : 'VALIDATION_ERROR';
      const messages: Record<string, string> = {
        REQUEST_NOT_APPROVABLE: 'This request cannot be approved anymore.',
        REQUEST_EXPIRED: 'Approval token has expired.',
        INVALID_APPROVAL_TOKEN: 'Invalid approval token.',
      };

      throw new BadRequestException({
        code,
        message: messages[code] ?? 'Approval failed.',
      });
    }
  }
}

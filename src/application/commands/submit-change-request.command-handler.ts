import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { IsNull, Not, Repository } from 'typeorm';
import {
  ChangeActionType,
  ChangeRequestStatus,
  PositionStatus,
  ReassignmentStrategy,
} from '../../domain/org-chart.enums';
import { EmailPolicy, PositionPolicy } from '../../domain/org-chart.policies';
import { ApprovalEmailService } from '../../infrastructure/mail/approval-email.service';
import { PositionChangeRequestEntity } from '../../infrastructure/persistence/entities/position-change-request.entity';
import { PositionEntity } from '../../infrastructure/persistence/entities/position.entity';
import { OrgChartGraphService } from '../services/org-chart-graph.service';

export interface SubmitChangeRequestCommand {
  actionType: ChangeActionType;
  positionId?: string;
  payload: Record<string, unknown>;
  requesterEmail: string;
  requesterName: string;
}

@Injectable()
export class SubmitChangeRequestCommandHandler {
  constructor(
    @InjectRepository(PositionChangeRequestEntity)
    private readonly requestsRepository: Repository<PositionChangeRequestEntity>,
    @InjectRepository(PositionEntity)
    private readonly positionsRepository: Repository<PositionEntity>,
    private readonly graphService: OrgChartGraphService,
    private readonly configService: ConfigService,
    private readonly emailService: ApprovalEmailService,
  ) {}

  async execute(command: SubmitChangeRequestCommand) {
    const requesterName = this.requireText(command.requesterName, 'NAME_REQUIRED');
    const requesterEmail = this.wrapPolicyError(() =>
      EmailPolicy.normalizeRequesterEmail(
        command.requesterEmail,
        this.configService.get<string>('ORG_DOMAIN', 'perago.com'),
      ),
    );

    await this.validateCommand(command);

    const request = this.requestsRepository.create({
      actionType: command.actionType,
      positionId: command.positionId ?? null,
      payload: command.payload ?? {},
      requesterEmail,
      requesterName,
      requesterConfirmed: false,
      confirmationToken: randomUUID(),
      approverEmail: this.configService.get<string>(
        'APPROVER_EMAIL',
        'hr@perago.com',
      ),
      approvalToken: randomUUID(),
      approvalStatus: ChangeRequestStatus.PENDING_CONFIRMATION,
      approvedByName: null,
      approvedAt: null,
      executedAt: null,
      rejectionReason: null,
      expiresAt: new Date(
        Date.now() +
          this.configNumber('REQUEST_EXPIRY_DAYS', 7) * 24 * 60 * 60 * 1000,
      ),
    });

    const saved = await this.requestsRepository.save(request);
    await this.emailService.sendRequesterConfirmation(saved);

    return {
      success: true,
      data: {
        requestId: saved.id,
        status: saved.approvalStatus,
        message: 'Check your email to confirm this request.',
        links: this.emailService.buildDebugLinks(saved),
      },
    };
  }

  async validateCommand(command: SubmitChangeRequestCommand) {
    if (!Object.values(ChangeActionType).includes(command.actionType)) {
      throw new BadRequestException({
        code: 'INVALID_ACTION',
        message: 'Invalid actionType supplied.',
      });
    }

    if (command.actionType === ChangeActionType.CREATE) {
      await this.validateCreate(command.payload);
      return;
    }

    if (!command.positionId) {
      throw new BadRequestException({
        code: 'POSITION_NOT_FOUND',
        message: 'positionId is required for update and delete actions.',
      });
    }

    const position = await this.positionsRepository.findOne({
      where: { id: command.positionId, status: PositionStatus.ACTIVE },
    });
    if (!position) {
      throw new NotFoundException('Position not found.');
    }

    if (command.actionType === ChangeActionType.UPDATE) {
      await this.validateUpdate(position, command.payload);
      return;
    }

    await this.validateDelete(position, command.payload);
  }

  private async validateCreate(payload: Record<string, unknown>) {
    const name = this.requireText(payload.name, 'NAME_REQUIRED');
    this.requireText(payload.description, 'DESCRIPTION_REQUIRED');
    const parentId = payload.parentId ? this.requireUuid(payload.parentId, 'PARENT_NOT_FOUND') : null;

    let parentDepth = -1;
    if (parentId) {
      const parent = await this.positionsRepository.findOne({
        where: { id: parentId, status: PositionStatus.ACTIVE },
      });
      if (!parent) {
        throw new BadRequestException({
          code: 'PARENT_NOT_FOUND',
          message: 'Parent position not found.',
        });
      }
      parentDepth = parent.depth;
    } else {
      const roots = await this.positionsRepository.count({
        where: { parentId: IsNull(), status: PositionStatus.ACTIVE },
      });
      if (roots > 0) {
        throw new BadRequestException({
          code: 'ROOT_IMMUTABLE',
          message: 'The CEO root already exists and is immutable.',
        });
      }
    }

    const duplicate = await this.positionsRepository.count({
      where: {
        parentId: parentId ?? IsNull(),
        name,
        status: PositionStatus.ACTIVE,
      },
    });
    if (duplicate > 0) {
      throw new BadRequestException({
        code: 'DUPLICATE_NAME',
        message: 'A sibling position with the same name already exists.',
      });
    }

    this.wrapPolicyError(() =>
      PositionPolicy.assertDepthWithinLimit(
        parentDepth + 1,
        this.configNumber('MAX_DEPTH', 10),
      ),
    );
  }

  private async validateUpdate(
    position: PositionEntity,
    payload: Record<string, unknown>,
  ) {
    const name = this.requireText(payload.name ?? position.name, 'NAME_REQUIRED');
    this.requireText(
      payload.description ?? position.description,
      'DESCRIPTION_REQUIRED',
    );
    const parentId =
      payload.parentId === undefined
        ? position.parentId
        : payload.parentId === null
          ? null
          : this.requireUuid(payload.parentId, 'PARENT_NOT_FOUND');

    this.wrapPolicyError(() =>
      PositionPolicy.assertRootNotReparented(position.parentId, parentId),
    );

    if (parentId) {
      const parent = await this.positionsRepository.findOne({
        where: { id: parentId, status: PositionStatus.ACTIVE },
      });
      if (!parent) {
        throw new BadRequestException({
          code: 'PARENT_NOT_FOUND',
          message: 'Parent position not found.',
        });
      }

      const activePositions = await this.graphService.getActivePositions();
      const descendants = this.graphService.collectDescendantIds(
        position.id,
        activePositions,
      );
      this.wrapPolicyError(() =>
        PositionPolicy.assertNoCircularReference(position.id, parentId, descendants),
      );

      const subtreeDepth = await this.graphService.getSubtreeDepth(position.id);
      this.wrapPolicyError(() =>
        PositionPolicy.assertDepthWithinLimit(
          parent.depth + 1 + subtreeDepth,
          this.configNumber('MAX_DEPTH', 10),
        ),
      );
    }

    const duplicate = await this.positionsRepository.count({
      where: {
        parentId: parentId ?? IsNull(),
        name,
        id: Not(position.id),
        status: PositionStatus.ACTIVE,
      },
    });
    if (duplicate > 0) {
      throw new BadRequestException({
        code: 'DUPLICATE_NAME',
        message: 'A sibling position with the same name already exists.',
      });
    }
  }

  private async validateDelete(
    position: PositionEntity,
    payload: Record<string, unknown>,
  ) {
    this.wrapPolicyError(() =>
      PositionPolicy.assertRootNotDeleted(position.parentId),
    );

    const childrenCount = await this.positionsRepository.count({
      where: { parentId: position.id, status: PositionStatus.ACTIVE },
    });
    const strategy =
      payload.reassignmentStrategy === undefined
        ? undefined
        : this.requireReassignmentStrategy(payload.reassignmentStrategy);

    this.wrapPolicyError(() =>
      PositionPolicy.assertDeleteStrategy(
        ChangeActionType.DELETE,
        childrenCount,
        strategy,
      ),
    );
  }

  private requireText(value: unknown, code: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException({
        code,
        message: 'Required text value is missing.',
      });
    }

    return value.trim();
  }

  private requireUuid(value: unknown, code: string): string {
    if (
      typeof value !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
    ) {
      throw new BadRequestException({
        code,
        message: 'Expected a valid UUID.',
      });
    }

    return value;
  }

  private requireReassignmentStrategy(value: unknown): ReassignmentStrategy {
    if (!Object.values(ReassignmentStrategy).includes(value as ReassignmentStrategy)) {
      throw new BadRequestException({
        code: 'STRATEGY_REQUIRED',
        message: 'Invalid reassignmentStrategy supplied.',
      });
    }

    return value as ReassignmentStrategy;
  }

  private configNumber(key: string, fallback: number) {
    return Number(this.configService.get<string>(key, String(fallback)));
  }

  private wrapPolicyError<T>(factory: () => T): T {
    try {
      return factory();
    } catch (error) {
      throw this.mapPolicyError(error);
    }
  }

  private mapPolicyError(error: unknown) {
    const code = error instanceof Error ? error.message : 'VALIDATION_ERROR';
    const messageMap: Record<string, string> = {
      INVALID_EMAIL: 'Requester email must be a valid email address.',
      INVALID_DOMAIN: `Requester email must end with @${this.configService.get<string>(
        'ORG_DOMAIN',
        'perago.com',
      )} or be one of the allowed Gmail addresses.`,
      ROOT_IMMUTABLE: 'The CEO root position is immutable.',
      CIRCULAR_REFERENCE: 'A position cannot be moved under one of its descendants.',
      MAX_DEPTH_EXCEEDED: `The change would exceed the maximum depth of ${this.configNumber(
        'MAX_DEPTH',
        10,
      )}.`,
      STRATEGY_REQUIRED:
        'Deletion requires a reassignmentStrategy when children exist.',
    };

    return new BadRequestException({
      code,
      message: messageMap[code] ?? 'Validation failed.',
    });
  }
}

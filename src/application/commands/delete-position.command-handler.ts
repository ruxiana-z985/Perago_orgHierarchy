import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ChangeActionType,
  PositionStatus,
  ReassignmentStrategy,
} from '../../domain/org-chart.enums';
import { PositionPolicy } from '../../domain/org-chart.policies';
import { PositionEntity } from '../../infrastructure/persistence/entities/position.entity';
import { OrgChartGraphService } from '../services/org-chart-graph.service';

export interface DeletePositionCommand {
  reassignmentStrategy?: ReassignmentStrategy;
}

@Injectable()
export class DeletePositionCommandHandler {
  constructor(
    @InjectRepository(PositionEntity)
    private readonly positionsRepository: Repository<PositionEntity>,
    private readonly graphService: OrgChartGraphService,
    private readonly configService: ConfigService,
  ) {}

  async execute(id: string, command: DeletePositionCommand) {
    // Step 1: Find the position
    const position = await this.positionsRepository.findOne({
      where: { id, status: PositionStatus.ACTIVE },
    });
    if (!position) {
      throw new NotFoundException('Position not found.');
    }

    // Step 2: Cannot delete root
    this.wrapPolicyError(() =>
      PositionPolicy.assertRootNotDeleted(position.parentId),
    );

    // Step 3: Count children
    const childrenCount = await this.positionsRepository.count({
      where: { parentId: position.id, status: PositionStatus.ACTIVE },
    });

    // Step 4: Validate strategy
    const strategy = command.reassignmentStrategy
      ? this.requireReassignmentStrategy(command.reassignmentStrategy)
      : undefined;

    this.wrapPolicyError(() =>
      PositionPolicy.assertDeleteStrategy(
        ChangeActionType.DELETE,
        childrenCount,
        strategy,
      ),
    );

    // Step 5: Handle children
    if (childrenCount > 0 && strategy === ReassignmentStrategy.PROMOTE_TO_PARENT) {
      const children = await this.positionsRepository.find({
        where: { parentId: position.id, status: PositionStatus.ACTIVE },
      });
      for (const child of children) {
        child.parentId = position.parentId;
      }
      if (children.length > 0) {
        await this.positionsRepository.save(children);
      }
    }

    // Step 6: Soft delete
    position.status = PositionStatus.INACTIVE;
    position.parentId = null;
    position.path = '';
    position.depth = 0;
    await this.positionsRepository.save(position);
    await this.graphService.rebuildPaths();

    return {
      success: true,
      data: {
        id: position.id,
        name: position.name,
        status: position.status,
        childrenReassigned: childrenCount > 0,
        reassignmentStrategy: strategy ?? null,
      },
    };
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

  private configNumber(key: string, fallback: number): number {
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
      ROOT_IMMUTABLE: 'The CEO root position is immutable.',
      STRATEGY_REQUIRED: 'Deletion requires a reassignmentStrategy when children exist.',
    };
    return new BadRequestException({ code, message: messageMap[code] ?? 'Delete failed.' });
  }
}
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { PositionStatus } from '../../domain/org-chart.enums';
import { PositionPolicy } from '../../domain/org-chart.policies';
import { PositionEntity } from '../../infrastructure/persistence/entities/position.entity';
import { OrgChartGraphService } from '../services/org-chart-graph.service';

export interface UpdatePositionCommand {
  name?: string;
  description?: string;
  parentId?: string | null;
}

@Injectable()
export class UpdatePositionCommandHandler {
  constructor(
    @InjectRepository(PositionEntity)
    private readonly positionsRepository: Repository<PositionEntity>,
    private readonly graphService: OrgChartGraphService,
    private readonly configService: ConfigService,
  ) {}

  async execute(id: string, command: UpdatePositionCommand) {
    // Step 1: Find the position
    const position = await this.positionsRepository.findOne({
      where: { id, status: PositionStatus.ACTIVE },
    });
    if (!position) {
      throw new NotFoundException('Position not found.');
    }

    // Step 2: Determine what's changing
    const name = this.requireText(command.name ?? position.name, 'NAME_REQUIRED');
    const description = this.requireText(
      command.description ?? position.description,
      'DESCRIPTION_REQUIRED',
    );

    const parentId =
      command.parentId === undefined
        ? position.parentId
        : command.parentId === null
          ? null
          : this.requireUuid(command.parentId, 'PARENT_NOT_FOUND');

    // Step 3: Validate root is not being reparented
    this.wrapPolicyError(() =>
      PositionPolicy.assertRootNotReparented(position.parentId, parentId),
    );

    // Step 4: If new parent, validate it
    if (parentId && parentId !== position.parentId) {
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

    // Step 5: Check for duplicate names
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

    // Step 6: Apply updates
    position.name = name;
    position.description = description;
    position.parentId = parentId;

    await this.positionsRepository.save(position);
    await this.graphService.rebuildPaths();

    const refreshed = await this.positionsRepository.findOneOrFail({
      where: { id: position.id },
    });

    return {
      success: true,
      data: {
        id: refreshed.id,
        name: refreshed.name,
        description: refreshed.description,
        parentId: refreshed.parentId,
        path: refreshed.path,
        depth: refreshed.depth,
      },
    };
  }

  private requireText(value: unknown, code: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException({ code, message: 'Required text value is missing.' });
    }
    return value.trim();
  }

  private requireUuid(value: unknown, code: string): string {
    if (
      typeof value !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ) {
      throw new BadRequestException({ code, message: 'Expected a valid UUID.' });
    }
    return value;
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
      CIRCULAR_REFERENCE: 'A position cannot be moved under one of its descendants.',
      MAX_DEPTH_EXCEEDED: `The change would exceed the maximum depth of ${this.configNumber('MAX_DEPTH', 10)}.`,
    };
    return new BadRequestException({ code, message: messageMap[code] ?? 'Update failed.' });
  }
}
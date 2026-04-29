import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PositionStatus } from '../../domain/org-chart.enums';
import { PositionPolicy } from '../../domain/org-chart.policies';
import { PositionEntity } from '../../infrastructure/persistence/entities/position.entity';
import { OrgChartGraphService } from '../services/org-chart-graph.service';

export interface CreatePositionCommand {
  name: string;
  description: string;
  parentId?: string;
}

@Injectable()
export class CreatePositionCommandHandler {
  constructor(
    @InjectRepository(PositionEntity)
    private readonly positionsRepository: Repository<PositionEntity>,
    private readonly graphService: OrgChartGraphService,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: CreatePositionCommand) {
    // Step 1: Validate inputs
    const name = this.requireText(command.name, 'NAME_REQUIRED');
    const description = this.requireText(command.description, 'DESCRIPTION_REQUIRED');
    const parentId = command.parentId
      ? this.requireUuid(command.parentId, 'PARENT_NOT_FOUND')
      : null;

    // Step 2: Validate parent if specified
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

    // Step 3: Check for duplicate names at the same level
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

    // Step 4: Check depth limit
    this.wrapPolicyError(() =>
      PositionPolicy.assertDepthWithinLimit(
        parentDepth + 1,
        this.configNumber('MAX_DEPTH', 10),
      ),
    );

    // Step 5: Create and save
    const position = this.positionsRepository.create({
      name,
      description,
      parentId,
      path: '',
      depth: 0,
      status: PositionStatus.ACTIVE,
    });

    const saved = await this.positionsRepository.save(position);
    await this.graphService.rebuildPaths();

    const refreshed = await this.positionsRepository.findOneOrFail({
      where: { id: saved.id },
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
      MAX_DEPTH_EXCEEDED: `The change would exceed the maximum depth of ${this.configNumber('MAX_DEPTH', 10)}.`,
    };
    return new BadRequestException({ code, message: messageMap[code] ?? 'Create failed.' });
  }
}
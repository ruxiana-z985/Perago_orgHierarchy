import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PositionStatus } from '../../domain/org-chart.enums';
import { PositionEntity } from '../../infrastructure/persistence/entities/position.entity';
import { OrgChartGraphService } from '../services/org-chart-graph.service';

export interface GetPositionsQuery {
  format?: 'flat' | 'tree';
  rootId?: string;
  depth?: number;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'depth';
  search?: string;
}

@Injectable()
export class GetPositionsQueryHandler {
  constructor(
    @InjectRepository(PositionEntity)
    private readonly positionsRepository: Repository<PositionEntity>,
    private readonly graphService: OrgChartGraphService,
  ) {}

  async execute(query: GetPositionsQuery) {
    if ((query.format ?? 'flat') === 'tree') {
      return this.getTree(query);
    }

    return this.getFlat(query);
  }

  private async getFlat(query: GetPositionsQuery) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 50), 1), 100);
    const sortBy = query.sortBy ?? 'name';
    const search = query.search?.trim().toLowerCase();

    let positions = await this.positionsRepository.find({
      where: { status: PositionStatus.ACTIVE },
    });

    if (search) {
      positions = positions.filter((position) =>
        position.name.toLowerCase().includes(search),
      );
    }

    positions.sort((left, right) => {
      if (sortBy === 'createdAt') {
        return left.createdAt.getTime() - right.createdAt.getTime();
      }

      if (sortBy === 'depth') {
        return left.depth - right.depth || left.name.localeCompare(right.name);
      }

      return left.name.localeCompare(right.name);
    });

    const pageData = positions.slice((page - 1) * limit, page * limit);
    const activePositions = await this.graphService.getActivePositions();
    const counts = new Map<string, number>();
    activePositions.forEach((position) => {
      if (position.parentId) {
        counts.set(position.parentId, (counts.get(position.parentId) ?? 0) + 1);
      }
    });

    return {
      data: pageData.map((position) => ({
        id: position.id,
        name: position.name,
        description: position.description,
        parentId: position.parentId,
        path: position.path,
        depth: position.depth,
        childrenCount: counts.get(position.id) ?? 0,
        createdAt: position.createdAt,
      })),
      pagination: {
        page,
        limit,
        total: positions.length,
        totalPages: Math.max(Math.ceil(positions.length / limit), 1),
      },
    };
  }

  private async getTree(query: GetPositionsQuery) {
    let positions = await this.graphService.getActivePositions();

    if (query.search?.trim()) {
      const normalized = query.search.trim().toLowerCase();
      positions = positions.filter((position) =>
        position.name.toLowerCase().includes(normalized),
      );
    }

    if (query.rootId) {
      const root = positions.find((position) => position.id === query.rootId);
      if (!root) {
        throw new NotFoundException('Position not found.');
      }

      const descendants = this.graphService.collectDescendantIds(
        query.rootId,
        positions,
      );
      positions = positions.filter(
        (position) => position.id === query.rootId || descendants.has(position.id),
      );
    }

    return this.graphService.buildTree(
      positions,
      query.rootId,
      query.depth === undefined ? undefined : Number(query.depth),
    );
  }
}

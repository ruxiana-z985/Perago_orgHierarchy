import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PositionStatus } from '../../domain/org-chart.enums';
import { PositionEntity } from '../../infrastructure/persistence/entities/position.entity';
import { OrgChartGraphService } from '../services/org-chart-graph.service';

export interface GetPositionChildrenQuery {
  page?: number;
  limit?: number;
}

@Injectable()
export class GetPositionChildrenQueryHandler {
  constructor(
    @InjectRepository(PositionEntity)
    private readonly positionsRepository: Repository<PositionEntity>,
    private readonly graphService: OrgChartGraphService,
  ) {}

  async execute(id: string, query: GetPositionChildrenQuery) {
    await this.graphService.findActivePositionOrFail(id);

    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 50), 1), 100);
    const children = await this.positionsRepository.find({
      where: { parentId: id, status: PositionStatus.ACTIVE },
      order: { name: 'ASC' },
    });

    const paged = children.slice((page - 1) * limit, page * limit);
    const activePositions = await this.graphService.getActivePositions();
    const counts = new Map<string, number>();
    activePositions.forEach((position) => {
      if (position.parentId) {
        counts.set(position.parentId, (counts.get(position.parentId) ?? 0) + 1);
      }
    });

    return {
      data: paged.map((child) => {
        const childrenCount = counts.get(child.id) ?? 0;
        return {
          id: child.id,
          name: child.name,
          description: child.description,
          childrenCount,
          hasSubordinates: childrenCount > 0,
        };
      }),
      pagination: {
        page,
        limit,
        total: children.length,
      },
    };
  }
}

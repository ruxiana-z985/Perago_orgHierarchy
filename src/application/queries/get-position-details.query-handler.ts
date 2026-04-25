import { Injectable, NotFoundException } from '@nestjs/common';
import { OrgChartGraphService } from '../services/org-chart-graph.service';

@Injectable()
export class GetPositionDetailsQueryHandler {
  constructor(private readonly graphService: OrgChartGraphService) {}

  async execute(id: string) {
    const positions = await this.graphService.getActivePositions();
    const position = positions.find((item) => item.id === id);

    if (!position) {
      throw new NotFoundException('Position not found.');
    }

    const byId = new Map(positions.map((item) => [item.id, item]));
    const children = positions.filter((item) => item.parentId === id);
    const ancestors = [];
    let currentParentId = position.parentId;

    while (currentParentId) {
      const ancestor = byId.get(currentParentId);
      if (!ancestor) {
        break;
      }

      ancestors.unshift({
        id: ancestor.id,
        name: ancestor.name,
        depth: ancestor.depth,
      });
      currentParentId = ancestor.parentId;
    }

    const siblings = positions
      .filter(
        (item) =>
          item.parentId === position.parentId && item.id !== position.id,
      )
      .map((item) => ({
        id: item.id,
        name: item.name,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    return {
      id: position.id,
      name: position.name,
      description: position.description,
      parentId: position.parentId,
      path: position.path,
      depth: position.depth,
      ancestors,
      childrenCount: children.length,
      descendantCount: this.graphService.countDescendants(id, positions),
      siblings,
      createdAt: position.createdAt,
      updatedAt: position.updatedAt,
    };
  }
}

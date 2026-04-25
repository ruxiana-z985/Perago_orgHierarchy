import { BadRequestException, Injectable } from '@nestjs/common';
import { OrgChartGraphService } from '../services/org-chart-graph.service';

@Injectable()
export class SearchPositionsQueryHandler {
  constructor(private readonly graphService: OrgChartGraphService) {}

  async execute(query: string) {
    const normalized = query?.trim().toLowerCase();
    if (!normalized) {
      throw new BadRequestException('Query parameter "q" is required.');
    }

    const positions = await this.graphService.getActivePositions();
    const data = positions
      .filter(
        (position) =>
          position.name.toLowerCase().includes(normalized) ||
          position.path.toLowerCase().includes(normalized),
      )
      .map((position) => ({
        id: position.id,
        name: position.name,
        path: position.path,
        matchType:
          position.name.toLowerCase() === normalized ? 'exact' : 'related',
      }))
      .sort((left, right) => {
        if (left.matchType === right.matchType) {
          return left.name.localeCompare(right.name);
        }

        return left.matchType === 'exact' ? -1 : 1;
      });

    return { data };
  }
}

import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetPositionsQueryDto {
  @ApiPropertyOptional({ enum: ['flat', 'tree'], default: 'flat' })
  format?: 'flat' | 'tree';

  @ApiPropertyOptional({ format: 'uuid' })
  rootId?: string;

  @ApiPropertyOptional({ example: 3 })
  depth?: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  page?: number;

  @ApiPropertyOptional({ example: 50, default: 50 })
  limit?: number;

  @ApiPropertyOptional({ enum: ['name', 'createdAt', 'depth'], default: 'name' })
  sortBy?: 'name' | 'createdAt' | 'depth';

  @ApiPropertyOptional({ example: 'tech' })
  search?: string;
}

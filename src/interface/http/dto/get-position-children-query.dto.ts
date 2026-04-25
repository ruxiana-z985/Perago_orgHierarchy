import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetPositionChildrenQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  page?: number;

  @ApiPropertyOptional({ example: 50, default: 50 })
  limit?: number;
}

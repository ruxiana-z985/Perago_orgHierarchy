import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePositionDto {
  @ApiPropertyOptional({
    example: 'Lead Developer',
    description: 'New name for the position',
  })
  name?: string;

  @ApiPropertyOptional({
    example: 'Leads the engineering team and sets technical direction',
    description: 'New description for the position',
  })
  description?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
    description: 'New parent position ID. Set to null to make it a root position.',
  })
  parentId?: string | null;
}
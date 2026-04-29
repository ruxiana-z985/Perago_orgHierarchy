import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePositionDto {
  @ApiProperty({
    example: 'Senior Developer',
    description: 'The name of the position',
  })
  name: string;

  @ApiProperty({
    example: 'Builds and maintains core backend services',
    description: 'A description of the position',
  })
  description: string;

  @ApiPropertyOptional({
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
    description: 'The ID of the parent position. Omit to create a root position.',
  })
  parentId?: string;
}
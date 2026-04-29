import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReassignmentStrategy } from '../../../domain/org-chart.enums';

export class DeletePositionDto {
  @ApiPropertyOptional({
    enum: ReassignmentStrategy,
    description:
      'Required if the position has children. Specifies what happens to child positions.',
  })
  reassignmentStrategy?: ReassignmentStrategy;
}
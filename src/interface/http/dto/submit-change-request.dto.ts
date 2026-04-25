import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChangeActionType } from '../../../domain/org-chart.enums';

export class SubmitChangeRequestDto {
  @ApiProperty({ enum: ChangeActionType })
  actionType: ChangeActionType;

  @ApiPropertyOptional({ format: 'uuid' })
  positionId?: string;

  @ApiProperty({
    example: {
      name: 'Senior Backend Developer',
      description: 'Builds core services',
      parentId: '11111111-1111-4111-8111-111111111111',
    },
  })
  payload: Record<string, unknown>;

  @ApiProperty({ example: 'john.doe@perago.com' })
  requesterEmail: string;

  @ApiProperty({ example: 'John Doe' })
  requesterName: string;
}

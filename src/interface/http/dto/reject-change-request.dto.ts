import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RejectChangeRequestDto {
  @ApiProperty()
  token: string;

  @ApiProperty()
  reason: string;

  @ApiPropertyOptional()
  approverName?: string;
}

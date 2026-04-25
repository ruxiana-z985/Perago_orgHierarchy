import { ApiProperty } from '@nestjs/swagger';

export class ApproveChangeRequestQueryDto {
  @ApiProperty()
  token: string;

  @ApiProperty({ required: false })
  approverName?: string;
}

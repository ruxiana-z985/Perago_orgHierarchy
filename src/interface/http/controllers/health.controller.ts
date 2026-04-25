import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'System health status.' })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'healthy',
        timestamp: '2026-04-25T09:00:00.000Z',
        version: '1.0.0',
      },
    },
  })
  getHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}

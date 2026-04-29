// positions.controller.ts
// This is a PRIMARY ADAPTER in hexagonal architecture.
// It translates HTTP requests into calls to our application handlers.

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

// Query handlers (read operations)
import { GetPositionChildrenQueryHandler } from '../../../application/queries/get-position-children.query-handler';
import { GetPositionDetailsQueryHandler } from '../../../application/queries/get-position-details.query-handler';
import { GetPositionsQueryHandler } from '../../../application/queries/get-positions.query-handler';
import { SearchPositionsQueryHandler } from '../../../application/queries/search-positions.query-handler';

// Command handlers (write operations) - NEW
import { CreatePositionCommandHandler } from '../../../application/commands/create-position.command-handler';
import { UpdatePositionCommandHandler } from '../../../application/commands/update-position.command-handler';
import { DeletePositionCommandHandler } from '../../../application/commands/delete-position.command-handler';

// DTOs
import { GetPositionChildrenQueryDto } from '../dto/get-position-children-query.dto';
import { GetPositionsQueryDto } from '../dto/get-positions-query.dto';
import { CreatePositionDto } from '../dto/create-position.dto';
import { UpdatePositionDto } from '../dto/update-position.dto';
import { DeletePositionDto } from '../dto/delete-position.dto';

@ApiTags('positions')
@Controller()
export class PositionsController {
  constructor(
    // Read handlers (existing)
    private readonly getPositionsHandler: GetPositionsQueryHandler,
    private readonly getPositionDetailsHandler: GetPositionDetailsQueryHandler,
    private readonly getPositionChildrenHandler: GetPositionChildrenQueryHandler,
    private readonly searchPositionsHandler: SearchPositionsQueryHandler,

    // Write handlers (new)
    private readonly createPositionHandler: CreatePositionCommandHandler,
    private readonly updatePositionHandler: UpdatePositionCommandHandler,
    private readonly deletePositionHandler: DeletePositionCommandHandler,
  ) {}

  // ============================================
  // READ ENDPOINTS (unchanged from original)
  // ============================================

  @Get('positions')
  @ApiOperation({ summary: 'List active positions in flat or tree format.' })
  @ApiQuery({ name: 'format', required: false })
  @ApiQuery({ name: 'rootId', required: false })
  @ApiQuery({ name: 'depth', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'search', required: false })
  getPositions(@Query() query: GetPositionsQueryDto) {
    return this.getPositionsHandler.execute(query);
  }

  @Get('positions/:id')
  @ApiOperation({ summary: 'Get a single position with context.' })
  getPosition(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.getPositionDetailsHandler.execute(id);
  }

  @Get('positions/:id/children')
  @ApiOperation({ summary: 'Get direct child positions only.' })
  getChildren(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: GetPositionChildrenQueryDto,
  ) {
    return this.getPositionChildrenHandler.execute(id, query);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search positions by name.' })
  @ApiQuery({ name: 'q', required: true, example: 'tech' })
  search(@Query('q') q: string) {
    return this.searchPositionsHandler.execute(q);
  }

  // ============================================
  // WRITE ENDPOINTS (NEW - replaces the workflow)
  // ============================================

  @Post('positions')
  @ApiOperation({ summary: 'Create a new position directly.' })
  createPosition(@Body() dto: CreatePositionDto) {
    return this.createPositionHandler.execute(dto);
  }

  @Patch('positions/:id')
  @ApiOperation({ summary: 'Update an existing position directly.' })
  updatePosition(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePositionDto,
  ) {
    return this.updatePositionHandler.execute(id, dto);
  }

  @Delete('positions/:id')
  @ApiOperation({ summary: 'Delete a position directly.' })
  deletePosition(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DeletePositionDto,
  ) {
    return this.deletePositionHandler.execute(id, dto);
  }
}
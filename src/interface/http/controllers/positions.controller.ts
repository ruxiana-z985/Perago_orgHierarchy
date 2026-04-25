import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GetPositionChildrenQueryHandler } from '../../../application/queries/get-position-children.query-handler';
import { GetPositionDetailsQueryHandler } from '../../../application/queries/get-position-details.query-handler';
import { GetPositionsQueryHandler } from '../../../application/queries/get-positions.query-handler';
import { SearchPositionsQueryHandler } from '../../../application/queries/search-positions.query-handler';
import { GetPositionChildrenQueryDto } from '../dto/get-position-children-query.dto';
import { GetPositionsQueryDto } from '../dto/get-positions-query.dto';

@ApiTags('positions')
@Controller()
export class PositionsController {
  constructor(
    private readonly getPositionsHandler: GetPositionsQueryHandler,
    private readonly getPositionDetailsHandler: GetPositionDetailsQueryHandler,
    private readonly getPositionChildrenHandler: GetPositionChildrenQueryHandler,
    private readonly searchPositionsHandler: SearchPositionsQueryHandler,
  ) {}

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
}

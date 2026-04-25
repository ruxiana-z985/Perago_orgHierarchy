import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApproveChangeRequestCommandHandler } from '../../../application/commands/approve-change-request.command-handler';
import { ConfirmChangeRequestCommandHandler } from '../../../application/commands/confirm-change-request.command-handler';
import { RejectChangeRequestCommandHandler } from '../../../application/commands/reject-change-request.command-handler';
import { SubmitChangeRequestCommandHandler } from '../../../application/commands/submit-change-request.command-handler';
import { GetChangeRequestAuditQueryHandler } from '../../../application/queries/get-change-request-audit.query-handler';
import { GetChangeRequestQueryHandler } from '../../../application/queries/get-change-request.query-handler';
import { ApproveChangeRequestQueryDto } from '../dto/approve-change-request-query.dto';
import { RejectChangeRequestDto } from '../dto/reject-change-request.dto';
import { SubmitChangeRequestDto } from '../dto/submit-change-request.dto';

@ApiTags('requests')
@Controller('requests')
export class RequestsController {
  constructor(
    private readonly submitHandler: SubmitChangeRequestCommandHandler,
    private readonly confirmHandler: ConfirmChangeRequestCommandHandler,
    private readonly approveHandler: ApproveChangeRequestCommandHandler,
    private readonly rejectHandler: RejectChangeRequestCommandHandler,
    private readonly getRequestHandler: GetChangeRequestQueryHandler,
    private readonly getAuditHandler: GetChangeRequestAuditQueryHandler,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Submit a create, update, or delete request.' })
  create(@Body() dto: SubmitChangeRequestDto) {
    return this.submitHandler.execute(dto);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Requester confirms a request.' })
  @ApiQuery({ name: 'token', required: true })
  confirm(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('token') token: string,
  ) {
    return this.confirmHandler.execute(id, token);
  }

  @Get(':id/confirm')
  @ApiOperation({ summary: 'Requester confirms a request from an email link.' })
  @ApiQuery({ name: 'token', required: true })
  confirmFromEmail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('token') token: string,
  ) {
    return this.confirmHandler.execute(id, token);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get request status and impact details.' })
  getRequest(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.getRequestHandler.execute(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approver executes an approved request.' })
  @ApiQuery({ name: 'token', required: true })
  @ApiQuery({ name: 'approverName', required: false })
  approve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: ApproveChangeRequestQueryDto,
  ) {
    return this.approveHandler.execute(id, query.token, query.approverName);
  }

  @Get(':id/approve')
  @ApiOperation({ summary: 'Approver executes an approved request from an email link.' })
  @ApiQuery({ name: 'token', required: true })
  @ApiQuery({ name: 'approverName', required: false })
  approveFromEmail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: ApproveChangeRequestQueryDto,
  ) {
    return this.approveHandler.execute(id, query.token, query.approverName);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Approver rejects a request.' })
  @ApiBody({ type: RejectChangeRequestDto })
  reject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RejectChangeRequestDto,
  ) {
    return this.rejectHandler.execute({ id, ...dto });
  }

  @Get(':id/audit')
  @ApiOperation({ summary: 'Full audit trail for a request.' })
  getAudit(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.getAuditHandler.execute(id);
  }
}

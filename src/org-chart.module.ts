import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApproveChangeRequestCommandHandler } from './application/commands/approve-change-request.command-handler';
import { ConfirmChangeRequestCommandHandler } from './application/commands/confirm-change-request.command-handler';
import { RejectChangeRequestCommandHandler } from './application/commands/reject-change-request.command-handler';
import { SubmitChangeRequestCommandHandler } from './application/commands/submit-change-request.command-handler';
import { GetChangeRequestAuditQueryHandler } from './application/queries/get-change-request-audit.query-handler';
import { GetChangeRequestQueryHandler } from './application/queries/get-change-request.query-handler';
import { GetPositionChildrenQueryHandler } from './application/queries/get-position-children.query-handler';
import { GetPositionDetailsQueryHandler } from './application/queries/get-position-details.query-handler';
import { GetPositionsQueryHandler } from './application/queries/get-positions.query-handler';
import { SearchPositionsQueryHandler } from './application/queries/search-positions.query-handler';
import { OrgChartGraphService } from './application/services/org-chart-graph.service';
import { ApprovalEmailService } from './infrastructure/mail/approval-email.service';
import { ChangeRequestExpiryService } from './infrastructure/persistence/change-request-expiry.service';
import { AuditLogEntity } from './infrastructure/persistence/entities/audit-log.entity';
import { PositionChangeRequestEntity } from './infrastructure/persistence/entities/position-change-request.entity';
import { PositionEntity } from './infrastructure/persistence/entities/position.entity';
import { OrgChartSeedService } from './infrastructure/persistence/org-chart-seed.service';
import { HealthController } from './interface/http/controllers/health.controller';
import { PositionsController } from './interface/http/controllers/positions.controller';
import { RequestsController } from './interface/http/controllers/requests.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PositionEntity,
      PositionChangeRequestEntity,
      AuditLogEntity,
    ]),
  ],
  controllers: [HealthController, PositionsController, RequestsController],
  providers: [
    OrgChartGraphService,
    ApprovalEmailService,
    OrgChartSeedService,
    ChangeRequestExpiryService,
    GetPositionsQueryHandler,
    GetPositionDetailsQueryHandler,
    GetPositionChildrenQueryHandler,
    SearchPositionsQueryHandler,
    GetChangeRequestQueryHandler,
    GetChangeRequestAuditQueryHandler,
    SubmitChangeRequestCommandHandler,
    ConfirmChangeRequestCommandHandler,
    ApproveChangeRequestCommandHandler,
    RejectChangeRequestCommandHandler,
  ],
})
export class OrgChartModule {}

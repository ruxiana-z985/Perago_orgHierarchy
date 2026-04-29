// org-chart.module.ts
// This is the feature module for the org chart.
// It tells NestJS: "Here are all the pieces that work together for this feature."

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// ---- APPLICATION LAYER ----
// Command handlers (write operations)
import { CreatePositionCommandHandler } from './application/commands/create-position.command-handler';
import { UpdatePositionCommandHandler } from './application/commands/update-position.command-handler';
import { DeletePositionCommandHandler } from './application/commands/delete-position.command-handler';

// Query handlers (read operations)
import { GetPositionsQueryHandler } from './application/queries/get-positions.query-handler';
import { GetPositionDetailsQueryHandler } from './application/queries/get-position-details.query-handler';
import { GetPositionChildrenQueryHandler } from './application/queries/get-position-children.query-handler';
import { SearchPositionsQueryHandler } from './application/queries/search-positions.query-handler';

// Domain service
import { OrgChartGraphService } from './application/services/org-chart-graph.service';

// ---- INFRASTRUCTURE LAYER ----
// Database entities
import { PositionEntity } from './infrastructure/persistence/entities/position.entity';

// Seed service (populates initial data)
import { OrgChartSeedService } from './infrastructure/persistence/org-chart-seed.service';

// ---- INTERFACE LAYER ----
// Controllers
import { HealthController } from './interface/http/controllers/health.controller';
import { PositionsController } from './interface/http/controllers/positions.controller';

@Module({
  imports: [
    // Register the database tables this module uses
    // Only PositionEntity remains - the request and audit entities are gone
    TypeOrmModule.forFeature([PositionEntity]),
  ],
  controllers: [
    // HTTP controllers
    HealthController,
    PositionsController,
  ],
  providers: [
    // ---- Domain Services ----
    OrgChartGraphService,

    // ---- Infrastructure Services ----
    OrgChartSeedService,

    // ---- Query Handlers (Reads) ----
    GetPositionsQueryHandler,
    GetPositionDetailsQueryHandler,
    GetPositionChildrenQueryHandler,
    SearchPositionsQueryHandler,

    // ---- Command Handlers (Writes) ----
    CreatePositionCommandHandler,
    UpdatePositionCommandHandler,
    DeletePositionCommandHandler,
  ],
})
export class OrgChartModule {}
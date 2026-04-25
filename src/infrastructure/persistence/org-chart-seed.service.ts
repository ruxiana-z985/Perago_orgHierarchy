import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PositionStatus } from '../../domain/org-chart.enums';
import { OrgChartGraphService } from '../../application/services/org-chart-graph.service';
import { PositionEntity } from './entities/position.entity';

@Injectable()
export class OrgChartSeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(PositionEntity)
    private readonly positionsRepository: Repository<PositionEntity>,
    private readonly graphService: OrgChartGraphService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const activeCount = await this.positionsRepository.count({
      where: { status: PositionStatus.ACTIVE },
    });

    if (activeCount > 0) {
      await this.graphService.rebuildPaths();
      return;
    }

    const ceo = await this.positionsRepository.save(
      this.positionsRepository.create({
        name: 'CEO',
        description: 'Leads organization',
        parentId: null,
        path: 'CEO',
        depth: 0,
        status: PositionStatus.ACTIVE,
      }),
    );

    const [cto, cfo, coo, hr] = await this.positionsRepository.save([
      this.positionsRepository.create({
        name: 'CTO',
        description: 'Leads technology',
        parentId: ceo.id,
        path: '',
        depth: 1,
        status: PositionStatus.ACTIVE,
      }),
      this.positionsRepository.create({
        name: 'CFO',
        description: 'Leads finance',
        parentId: ceo.id,
        path: '',
        depth: 1,
        status: PositionStatus.ACTIVE,
      }),
      this.positionsRepository.create({
        name: 'COO',
        description: 'Leads operations',
        parentId: ceo.id,
        path: '',
        depth: 1,
        status: PositionStatus.ACTIVE,
      }),
      this.positionsRepository.create({
        name: 'HR',
        description: 'Leads people operations',
        parentId: ceo.id,
        path: '',
        depth: 1,
        status: PositionStatus.ACTIVE,
      }),
    ]);

    const projectManager = await this.positionsRepository.save(
      this.positionsRepository.create({
        name: 'Project Manager',
        description: 'Coordinates delivery teams',
        parentId: cto.id,
        path: '',
        depth: 2,
        status: PositionStatus.ACTIVE,
      }),
    );

    const productOwner = await this.positionsRepository.save(
      this.positionsRepository.create({
        name: 'Product Owner',
        description: 'Owns backlog priorities',
        parentId: projectManager.id,
        path: '',
        depth: 3,
        status: PositionStatus.ACTIVE,
      }),
    );

    await this.positionsRepository.save([
      this.positionsRepository.create({
        name: 'Tech Lead',
        description: 'Leads the engineering squad',
        parentId: productOwner.id,
        path: '',
        depth: 4,
        status: PositionStatus.ACTIVE,
      }),
      this.positionsRepository.create({
        name: 'Chief Accountant',
        description: 'Owns accounting operations',
        parentId: cfo.id,
        path: '',
        depth: 2,
        status: PositionStatus.ACTIVE,
      }),
      this.positionsRepository.create({
        name: 'Operations Manager',
        description: 'Runs day-to-day operations',
        parentId: coo.id,
        path: '',
        depth: 2,
        status: PositionStatus.ACTIVE,
      }),
      this.positionsRepository.create({
        name: 'Talent Officer',
        description: 'Supports recruitment and retention',
        parentId: hr.id,
        path: '',
        depth: 2,
        status: PositionStatus.ACTIVE,
      }),
    ]);

    await this.graphService.rebuildPaths();
  }
}

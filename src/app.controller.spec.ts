import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './interface/http/controllers/health.controller';
import { PositionsController } from './interface/http/controllers/positions.controller';
import { GetPositionsQueryHandler } from './application/queries/get-positions.query-handler';
import { GetPositionDetailsQueryHandler } from './application/queries/get-position-details.query-handler';
import { GetPositionChildrenQueryHandler } from './application/queries/get-position-children.query-handler';
import { SearchPositionsQueryHandler } from './application/queries/search-positions.query-handler';
import { CreatePositionCommandHandler } from './application/commands/create-position.command-handler';
import { UpdatePositionCommandHandler } from './application/commands/update-position.command-handler';
import { DeletePositionCommandHandler } from './application/commands/delete-position.command-handler';

describe('HTTP Controllers', () => {
  let healthController: HealthController;
  let positionsController: PositionsController;

  const queryMocks = {
    getPositions: { execute: jest.fn() },
    getPositionDetails: { execute: jest.fn() },
    getPositionChildren: { execute: jest.fn() },
    searchPositions: { execute: jest.fn() },
  };

  const commandMocks = {
    createPosition: { execute: jest.fn() },
    updatePosition: { execute: jest.fn() },
    deletePosition: { execute: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController, PositionsController],
      providers: [
        { provide: GetPositionsQueryHandler, useValue: queryMocks.getPositions },
        { provide: GetPositionDetailsQueryHandler, useValue: queryMocks.getPositionDetails },
        { provide: GetPositionChildrenQueryHandler, useValue: queryMocks.getPositionChildren },
        { provide: SearchPositionsQueryHandler, useValue: queryMocks.searchPositions },
        { provide: CreatePositionCommandHandler, useValue: commandMocks.createPosition },
        { provide: UpdatePositionCommandHandler, useValue: commandMocks.updatePosition },
        { provide: DeletePositionCommandHandler, useValue: commandMocks.deletePosition },
      ],
    }).compile();

    healthController = moduleRef.get(HealthController);
    positionsController = moduleRef.get(PositionsController);
  });

  it('returns health status', () => {
    const response = healthController.getHealth();
    expect(response.status).toBe('healthy');
    expect(response.version).toBe('1.0.0');
    expect(typeof response.timestamp).toBe('string');
  });

  it('lists positions', async () => {
    const query = { format: 'flat' as const };
    const response = { data: [], pagination: { page: 1, limit: 50, total: 0 } };
    queryMocks.getPositions.execute.mockResolvedValue(response);
    await expect(positionsController.getPositions(query)).resolves.toEqual(response);
    expect(queryMocks.getPositions.execute).toHaveBeenCalledWith(query);
  });

  it('gets one position', async () => {
    const id = '7e59dbfd-c0d4-4f71-bd3d-c17c7b4a1c8b';
    const response = { id, name: 'CTO' };
    queryMocks.getPositionDetails.execute.mockResolvedValue(response);
    await expect(positionsController.getPosition(id)).resolves.toEqual(response);
  });

  it('gets direct children', async () => {
    const id = '7e59dbfd-c0d4-4f71-bd3d-c17c7b4a1c8b';
    const query = { page: 1, limit: 50 };
    const response = { data: [], pagination: { page: 1, limit: 50, total: 0 } };
    queryMocks.getPositionChildren.execute.mockResolvedValue(response);
    await expect(positionsController.getChildren(id, query)).resolves.toEqual(response);
  });

  it('searches positions', async () => {
    const response = { data: [{ id: '1', name: 'Tech Lead' }] };
    queryMocks.searchPositions.execute.mockResolvedValue(response);
    await expect(positionsController.search('tech')).resolves.toEqual(response);
  });

  it('creates a position', async () => {
    const dto = {
      name: 'Senior Developer',
      description: 'Builds core services',
      parentId: '7e59dbfd-c0d4-4f71-bd3d-c17c7b4a1c8b',
    };
    const response = {
      success: true,
      data: { id: 'new-id', name: dto.name },
    };
    commandMocks.createPosition.execute.mockResolvedValue(response);
    await expect(positionsController.createPosition(dto as any)).resolves.toEqual(response);
    expect(commandMocks.createPosition.execute).toHaveBeenCalledWith(dto);
  });

  it('updates a position', async () => {
    const id = '7e59dbfd-c0d4-4f71-bd3d-c17c7b4a1c8b';
    const dto = { name: 'Updated Name' };
    const response = { success: true, data: { id, name: dto.name } };
    commandMocks.updatePosition.execute.mockResolvedValue(response);
    await expect(positionsController.updatePosition(id, dto as any)).resolves.toEqual(response);
    expect(commandMocks.updatePosition.execute).toHaveBeenCalledWith(id, dto);
  });

  it('deletes a position', async () => {
    const id = '7e59dbfd-c0d4-4f71-bd3d-c17c7b4a1c8b';
    const dto = { reassignmentStrategy: 'promote-to-parent' };
    const response = { success: true, data: { id, status: 'inactive' } };
    commandMocks.deletePosition.execute.mockResolvedValue(response);
    await expect(positionsController.deletePosition(id, dto as any)).resolves.toEqual(response);
    expect(commandMocks.deletePosition.execute).toHaveBeenCalledWith(id, dto);
  });
});
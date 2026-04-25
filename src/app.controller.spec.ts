import { Test, TestingModule } from '@nestjs/testing';
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
import { HealthController } from './interface/http/controllers/health.controller';
import { PositionsController } from './interface/http/controllers/positions.controller';
import { RequestsController } from './interface/http/controllers/requests.controller';

describe('HTTP Controllers', () => {
  let healthController: HealthController;
  let positionsController: PositionsController;
  let requestsController: RequestsController;

  const queryMocks = {
    getPositions: { execute: jest.fn() },
    getPositionDetails: { execute: jest.fn() },
    getPositionChildren: { execute: jest.fn() },
    searchPositions: { execute: jest.fn() },
    getRequest: { execute: jest.fn() },
    getAudit: { execute: jest.fn() },
  };

  const commandMocks = {
    submit: { execute: jest.fn() },
    confirm: { execute: jest.fn() },
    approve: { execute: jest.fn() },
    reject: { execute: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController, PositionsController, RequestsController],
      providers: [
        { provide: GetPositionsQueryHandler, useValue: queryMocks.getPositions },
        {
          provide: GetPositionDetailsQueryHandler,
          useValue: queryMocks.getPositionDetails,
        },
        {
          provide: GetPositionChildrenQueryHandler,
          useValue: queryMocks.getPositionChildren,
        },
        {
          provide: SearchPositionsQueryHandler,
          useValue: queryMocks.searchPositions,
        },
        {
          provide: GetChangeRequestQueryHandler,
          useValue: queryMocks.getRequest,
        },
        {
          provide: GetChangeRequestAuditQueryHandler,
          useValue: queryMocks.getAudit,
        },
        {
          provide: SubmitChangeRequestCommandHandler,
          useValue: commandMocks.submit,
        },
        {
          provide: ConfirmChangeRequestCommandHandler,
          useValue: commandMocks.confirm,
        },
        {
          provide: ApproveChangeRequestCommandHandler,
          useValue: commandMocks.approve,
        },
        {
          provide: RejectChangeRequestCommandHandler,
          useValue: commandMocks.reject,
        },
      ],
    }).compile();

    healthController = moduleRef.get(HealthController);
    positionsController = moduleRef.get(PositionsController);
    requestsController = moduleRef.get(RequestsController);
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

    await expect(positionsController.getPositions(query)).resolves.toEqual(
      response,
    );
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

    await expect(positionsController.getChildren(id, query)).resolves.toEqual(
      response,
    );
  });

  it('searches positions', async () => {
    const response = { data: [{ id: '1', name: 'Tech Lead' }] };
    queryMocks.searchPositions.execute.mockResolvedValue(response);

    await expect(positionsController.search('tech')).resolves.toEqual(response);
  });

  it('submits a change request', async () => {
    const body = {
      actionType: 'create',
      payload: {
        name: 'Lead Engineer',
        description: 'Leads technical delivery',
        parentId: '7e59dbfd-c0d4-4f71-bd3d-c17c7b4a1c8b',
      },
      requesterEmail: 'john.doe@perago.com',
      requesterName: 'John Doe',
    };
    const response = { success: true, data: { requestId: 'req-id' } };
    commandMocks.submit.execute.mockResolvedValue(response);

    await expect(requestsController.create(body as any)).resolves.toEqual(
      response,
    );
  });

  it('confirms a request', async () => {
    const response = { success: true, data: { status: 'pending-approval' } };
    commandMocks.confirm.execute.mockResolvedValue(response);

    await expect(
      requestsController.confirm(
        '7e59dbfd-c0d4-4f71-bd3d-c17c7b4a1c8b',
        'confirm-token',
      ),
    ).resolves.toEqual(response);
  });

  it('approves a request', async () => {
    const response = { success: true, data: { status: 'executed' } };
    commandMocks.approve.execute.mockResolvedValue(response);

    await expect(
      requestsController.approve('7e59dbfd-c0d4-4f71-bd3d-c17c7b4a1c8b', {
        token: 'approval-token',
        approverName: 'Jane Smith',
      }),
    ).resolves.toEqual(response);
  });

  it('rejects a request', async () => {
    const response = { success: true, data: { status: 'rejected' } };
    commandMocks.reject.execute.mockResolvedValue(response);

    await expect(
      requestsController.reject('7e59dbfd-c0d4-4f71-bd3d-c17c7b4a1c8b', {
        token: 'approval-token',
        reason: 'On hold',
        approverName: 'Jane Smith',
      }),
    ).resolves.toEqual(response);
  });

  it('returns request status', async () => {
    const response = { success: true, data: { requestId: 'req-id' } };
    queryMocks.getRequest.execute.mockResolvedValue(response);

    await expect(
      requestsController.getRequest('7e59dbfd-c0d4-4f71-bd3d-c17c7b4a1c8b'),
    ).resolves.toEqual(response);
  });

  it('returns request audit', async () => {
    const response = { success: true, data: { timeline: [] } };
    queryMocks.getAudit.execute.mockResolvedValue(response);

    await expect(
      requestsController.getAudit('7e59dbfd-c0d4-4f71-bd3d-c17c7b4a1c8b'),
    ).resolves.toEqual(response);
  });
});

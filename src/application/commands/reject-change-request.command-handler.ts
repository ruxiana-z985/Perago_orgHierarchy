import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChangeRequestStatus } from '../../domain/org-chart.enums';
import { RequestLifecyclePolicy } from '../../domain/org-chart.policies';
import { ApprovalEmailService } from '../../infrastructure/mail/approval-email.service';
import { PositionChangeRequestEntity } from '../../infrastructure/persistence/entities/position-change-request.entity';

export interface RejectChangeRequestCommand {
  id: string;
  token: string;
  reason: string;
  approverName?: string;
}

@Injectable()
export class RejectChangeRequestCommandHandler {
  constructor(
    @InjectRepository(PositionChangeRequestEntity)
    private readonly requestsRepository: Repository<PositionChangeRequestEntity>,
    private readonly emailService: ApprovalEmailService,
  ) {}

  async execute(command: RejectChangeRequestCommand) {
    const request = await this.requestsRepository.findOne({
      where: { id: command.id },
    });
    if (!request) {
      throw new NotFoundException('Change request not found.');
    }

    if (this.applyExpiry(request)) {
      await this.requestsRepository.save(request);
    }

    this.wrapPolicyError(() =>
      RequestLifecyclePolicy.ensureApprovable(
        request.approvalStatus,
        request.expiresAt,
        request.approvalToken === command.token,
      ),
    );

    request.approvalStatus = ChangeRequestStatus.REJECTED;
    request.rejectionReason = this.requireText(command.reason, 'REASON_REQUIRED');
    request.approvedByName = this.requireText(
      command.approverName ?? request.approverEmail.split('@')[0],
      'APPROVER_NAME_REQUIRED',
    );
    request.approvedAt = new Date();
    request.approvalToken = null;
    const saved = await this.requestsRepository.save(request);
    await this.emailService.sendRequesterOutcome(saved, 'rejected');

    return {
      success: true,
      data: {
        requestId: saved.id,
        status: saved.approvalStatus,
        rejectionReason: saved.rejectionReason,
      },
    };
  }

  private applyExpiry(request: PositionChangeRequestEntity) {
    if (
      request.expiresAt < new Date() &&
      ![
        ChangeRequestStatus.EXECUTED,
        ChangeRequestStatus.REJECTED,
        ChangeRequestStatus.EXPIRED,
      ].includes(request.approvalStatus)
    ) {
      request.approvalStatus = ChangeRequestStatus.EXPIRED;
      request.confirmationToken = null;
      request.approvalToken = null;
      return true;
    }

    return false;
  }

  private requireText(value: string, code: string): string {
    if (!value || value.trim().length === 0) {
      throw new BadRequestException({
        code,
        message: 'Required text value is missing.',
      });
    }

    return value.trim();
  }

  private wrapPolicyError<T>(factory: () => T): T {
    try {
      return factory();
    } catch (error) {
      const code = error instanceof Error ? error.message : 'VALIDATION_ERROR';
      const messages: Record<string, string> = {
        REQUEST_NOT_APPROVABLE: 'This request cannot be rejected anymore.',
        REQUEST_EXPIRED: 'Approval token has expired.',
        INVALID_APPROVAL_TOKEN: 'Invalid approval token.',
      };

      throw new BadRequestException({
        code,
        message: messages[code] ?? 'Rejection failed.',
      });
    }
  }
}

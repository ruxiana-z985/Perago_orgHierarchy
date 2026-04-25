import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChangeRequestStatus } from '../../domain/org-chart.enums';
import { RequestLifecyclePolicy } from '../../domain/org-chart.policies';
import { ApprovalEmailService } from '../../infrastructure/mail/approval-email.service';
import { PositionChangeRequestEntity } from '../../infrastructure/persistence/entities/position-change-request.entity';

@Injectable()
export class ConfirmChangeRequestCommandHandler {
  constructor(
    @InjectRepository(PositionChangeRequestEntity)
    private readonly requestsRepository: Repository<PositionChangeRequestEntity>,
    private readonly configService: ConfigService,
    private readonly emailService: ApprovalEmailService,
  ) {}

  async execute(id: string, token: string) {
    const request = await this.requestsRepository.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException('Change request not found.');
    }

    if (this.applyExpiry(request)) {
      await this.requestsRepository.save(request);
    }

    this.wrapPolicyError(() =>
      RequestLifecyclePolicy.ensureConfirmable(
        request.approvalStatus,
        request.createdAt,
        this.configNumber('CONFIRMATION_EXPIRY_HOURS', 1),
        request.confirmationToken === token,
      ),
    );

    request.requesterConfirmed = true;
    request.confirmationToken = null;
    request.approvalStatus = ChangeRequestStatus.PENDING_APPROVAL;
    const saved = await this.requestsRepository.save(request);

    await this.emailService.sendApproverDecision(saved);

    return {
      success: true,
      data: {
        requestId: saved.id,
        status: saved.approvalStatus,
        message: 'Request forwarded to HR for approval.',
        links: this.emailService.buildDebugLinks(saved),
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

  private configNumber(key: string, fallback: number) {
    return Number(this.configService.get<string>(key, String(fallback)));
  }

  private wrapPolicyError<T>(factory: () => T): T {
    try {
      return factory();
    } catch (error) {
      const code = error instanceof Error ? error.message : 'VALIDATION_ERROR';
      const messages: Record<string, string> = {
        REQUEST_NOT_CONFIRMABLE: 'This request cannot be confirmed anymore.',
        CONFIRMATION_EXPIRED: 'Confirmation token has expired.',
        INVALID_CONFIRMATION_TOKEN: 'Invalid confirmation token.',
      };

      throw new BadRequestException({
        code,
        message: messages[code] ?? 'Confirmation failed.',
      });
    }
  }
}

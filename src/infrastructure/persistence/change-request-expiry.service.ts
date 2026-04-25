import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { ChangeRequestStatus } from '../../domain/org-chart.enums';
import { PositionChangeRequestEntity } from './entities/position-change-request.entity';

@Injectable()
export class ChangeRequestExpiryService {
  constructor(
    @InjectRepository(PositionChangeRequestEntity)
    private readonly requestsRepository: Repository<PositionChangeRequestEntity>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async expireOldRequests(): Promise<void> {
    const expirableStatuses = [
      ChangeRequestStatus.PENDING_CONFIRMATION,
      ChangeRequestStatus.PENDING_APPROVAL,
      ChangeRequestStatus.APPROVED,
    ];

    const expiredRequests = await this.requestsRepository.find({
      where: {
        approvalStatus: In(expirableStatuses),
        expiresAt: LessThan(new Date()),
      },
    });

    if (expiredRequests.length === 0) {
      return;
    }

    expiredRequests.forEach((request) => {
      request.approvalStatus = ChangeRequestStatus.EXPIRED;
      request.confirmationToken = null;
      request.approvalToken = null;
    });

    await this.requestsRepository.save(expiredRequests);
  }
}

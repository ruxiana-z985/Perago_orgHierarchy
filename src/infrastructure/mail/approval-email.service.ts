import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PositionChangeRequestEntity } from '../persistence/entities/position-change-request.entity';

@Injectable()
export class ApprovalEmailService {
  private readonly logger = new Logger(ApprovalEmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendRequesterConfirmation(
    request: PositionChangeRequestEntity,
  ): Promise<void> {
    await this.sendEmail({
      to: request.requesterEmail,
      subject: 'Confirm your Perago org chart request',
      text: `Confirm your request: ${this.confirmationUrl(request)}`,
    });
  }

  async sendApproverDecision(
    request: PositionChangeRequestEntity,
  ): Promise<void> {
    await this.sendEmail({
      to: request.approverEmail,
      subject: 'Approve or reject a Perago org chart change',
      text: `Approve: ${this.approveUrl(request)}\nReject endpoint: ${this.rejectUrl(request)}`,
    });
  }

  async sendRequesterOutcome(
    request: PositionChangeRequestEntity,
    outcome: 'approved' | 'rejected',
  ): Promise<void> {
    await this.sendEmail({
      to: request.requesterEmail,
      subject: `Perago org chart request ${outcome}`,
      text: `Your request ${request.id} has been ${outcome}.`,
    });
  }

  buildDebugLinks(request: PositionChangeRequestEntity) {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      return undefined;
    }

    return {
      confirmationUrl: request.confirmationToken
        ? this.confirmationUrl(request)
        : null,
      approveUrl: request.approvalToken ? this.approveUrl(request) : null,
      rejectUrl: this.rejectUrl(request),
      statusUrl: `${this.baseUrl()}/requests/${request.id}`,
      auditUrl: `${this.baseUrl()}/requests/${request.id}/audit`,
    };
  }

  private confirmationUrl(request: PositionChangeRequestEntity) {
    return `${this.baseUrl()}/requests/${request.id}/confirm?token=${request.confirmationToken}`;
  }

  private approveUrl(request: PositionChangeRequestEntity) {
    return `${this.baseUrl()}/requests/${request.id}/approve?token=${request.approvalToken}`;
  }

  private rejectUrl(request: PositionChangeRequestEntity) {
    return `${this.baseUrl()}/requests/${request.id}/reject`;
  }

  private baseUrl(): string {
    return this.configService.get<string>(
      'API_BASE_URL',
      `http://localhost:${this.configService.get<string>('PORT', '3000')}`,
    );
  }

  private async sendEmail(options: {
    to: string;
    subject: string;
    text: string;
  }): Promise<void> {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');
    const port = Number(this.configService.get<string>('SMTP_PORT', '587'));
    const from =
      this.configService.get<string>('SMTP_FROM') ??
      this.configService.get<string>('APPROVER_EMAIL', 'hr@perago.com');

    if (host && user && pass) {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });

      await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
      });
      return;
    }

    this.logger.log(
      `Email preview -> to=${options.to} subject="${options.subject}" body="${options.text}"`,
    );
  }
}

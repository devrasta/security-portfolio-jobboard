import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendMail(params: {
    to: string;
    subject: string;
    template: string;
    context: ISendMailOptions['context'];
  }): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: params.to,
        subject: params.subject,
        template: params.template,
        context: params.context,
      });
      this.logger.log(`Email "${params.subject}" sent to ${params.to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email "${params.subject}" to ${params.to}`,
        error,
      );
      throw error;
    }
  }

  async sendCompanyInviteEmail(params: {
    to: string;
    companyName: string;
    invitationLink: string;
  }): Promise<void> {
    await this.sendMail({
      to: params.to,
      subject: `You've been invited to join ${params.companyName}`,
      template: 'company-invite',
      context: {
        companyName: params.companyName,
        invitationLink: params.invitationLink,
      },
    });
  }
}

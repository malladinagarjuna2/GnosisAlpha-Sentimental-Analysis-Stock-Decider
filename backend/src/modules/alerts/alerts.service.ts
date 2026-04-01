// src/modules/alerts/alerts.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from './email.service';
import type { CreateAlertDto } from './dto/create-alert.dto';
import { AlertType, Prisma } from '@prisma/client';

export type { CreateAlertDto };

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreateAlertDto) {
    const data: Prisma.AlertCreateInput = {
      user: { connect: { id: dto.userId } },
      type: dto.type as AlertType,
      message: dto.message,
      ...(dto.metadata !== undefined && {
        metadata: dto.metadata as Prisma.InputJsonValue,
      }),
    };

    const alert = await this.prisma.alert.create({ data });
    this.logger.log(`Alert [${dto.type}] created for user ${dto.userId}: ${dto.message}`);
    return alert;
  }

  findByUser(userId: string) {
    return this.prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  markSent(alertId: string) {
    return this.prisma.alert.update({
      where: { id: alertId },
      data: { sentAt: true },
    });
  }

  /**
   * Send email alert via nodemailer.
   * Silently skips if SMTP is not configured.
   */
  async sendEmailAlert(to: string, subject: string, body: string): Promise<void> {
    await this.emailService.send(to, subject, body);
  }
}

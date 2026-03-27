// src/modules/alerts/alerts.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateAlertDto } from './dto/create-alert.dto';
import { AlertType, Prisma } from '@prisma/client';

export type { CreateAlertDto };

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(private readonly prisma: PrismaService) {}

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

  /**
   * Email sending — will integrate nodemailer / SMTP in the next phase.
   */
  async sendEmailAlert(to: string, subject: string, body: string): Promise<void> {
    // TODO: integrate nodemailer with ConfigService SMTP settings
    this.logger.log(`[EMAIL STUB] To: ${to} | Subject: ${subject} | Body: ${body.slice(0, 80)}`);
  }
}

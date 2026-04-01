// src/modules/alerts/email.service.ts
// Wraps nodemailer — only sends if SMTP credentials are configured.
// EmailService is intentionally simple: one method, one responsibility.
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    // Only initialise transporter if real SMTP credentials are present
    const isConfigured =
      host &&
      user &&
      pass &&
      user !== 'your@gmail.com' &&
      pass !== 'your_app_password';

    if (isConfigured) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: false,
        auth: { user, pass },
      });
      this.logger.log(`📧 Email service ready — SMTP: ${host}`);
    } else {
      this.logger.warn(
        '📧 Email service disabled — SMTP credentials not configured in .env. ' +
        'Set SMTP_HOST, SMTP_USER, SMTP_PASS to enable.',
      );
    }
  }

  /**
   * Send an email alert.
   * Silently skips if SMTP is not configured (email is optional per spec).
   */
  async send(to: string, subject: string, body: string): Promise<void> {
    if (!this.transporter) {
      this.logger.debug(`[EMAIL SKIP] No SMTP configured. Would send to: ${to} | Subject: ${subject}`);
      return;
    }

    try {
      const from = this.config.get<string>('SMTP_USER');
      await this.transporter.sendMail({
        from: `"Market Sentiment Intelligence" <${from}>`,
        to,
        subject,
        text: body,
        html: this.buildHtml(subject, body),
      });
      this.logger.log(`📧 Email sent to ${to} | Subject: ${subject}`);
    } catch (err) {
      this.logger.error(`📧 Email failed to ${to}: ${(err as Error).message}`);
    }
  }

  private buildHtml(subject: string, body: string): string {
    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">📊 Market Sentiment Alert</h2>
        <h3 style="color: #e94560;">${subject}</h3>
        <p style="color: #333; line-height: 1.6;">${body.replace(/\n/g, '<br/>')}</p>
        <hr style="border: 1px solid #eee; margin-top: 24px;"/>
        <p style="color: #999; font-size: 12px;">
          Market Sentiment Intelligence — automated alert system.<br/>
          You are receiving this because you track this asset.
        </p>
      </div>
    `;
  }
}

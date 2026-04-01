// src/modules/events/events-bridge.service.ts
// Redis pub/sub bridge between workers (publisher) and HTTP server (subscriber).
// Workers call publish(), the HTTP server's EventsGateway subscribes in onModuleInit.
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

const CHANNEL = 'ws-events';

export interface WsEvent {
  event: 'new-post' | 'new-sentiment' | 'new-alert';
  data: Record<string, unknown>;
}

@Injectable()
export class EventsBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsBridgeService.name);
  private publisher: Redis;
  private subscriber: Redis | null = null;
  private handler: ((event: WsEvent) => void) | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('REDIS_HOST') ?? 'localhost';
    const port = this.config.get<number>('REDIS_PORT') ?? 6379;
    this.publisher = new Redis({ host, port, maxRetriesPerRequest: null });
  }

  async onModuleInit() {
    this.logger.log('📡 Events bridge ready (Redis pub/sub)');
  }

  async onModuleDestroy() {
    this.publisher.disconnect();
    this.subscriber?.disconnect();
  }

  /** Workers call this to publish an event */
  async publish(event: WsEvent): Promise<void> {
    await this.publisher.publish(CHANNEL, JSON.stringify(event));
  }

  /** HTTP server calls this to subscribe — receives events from workers */
  subscribe(handler: (event: WsEvent) => void): void {
    if (this.subscriber) return; // already subscribed

    const host = this.config.get<string>('REDIS_HOST') ?? 'localhost';
    const port = this.config.get<number>('REDIS_PORT') ?? 6379;
    this.subscriber = new Redis({ host, port, maxRetriesPerRequest: null });

    this.handler = handler;
    this.subscriber.subscribe(CHANNEL);
    this.subscriber.on('message', (_channel: string, message: string) => {
      try {
        const event: WsEvent = JSON.parse(message);
        this.handler?.(event);
      } catch {
        this.logger.warn('Failed to parse ws-event from Redis');
      }
    });
    this.logger.log('📡 Subscribed to worker events via Redis');
  }
}

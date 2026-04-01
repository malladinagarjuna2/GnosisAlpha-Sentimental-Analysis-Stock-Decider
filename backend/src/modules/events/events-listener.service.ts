// src/modules/events/events-listener.service.ts
// Runs ONLY in the HTTP server process.
// Subscribes to Redis pub/sub and forwards events to the WebSocket gateway.
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { EventsBridgeService } from './events-bridge.service';
import type { WsEvent } from './events-bridge.service';

@Injectable()
export class EventsListenerService implements OnModuleInit {
  private readonly logger = new Logger(EventsListenerService.name);

  constructor(
    private readonly gateway: EventsGateway,
    private readonly bridge: EventsBridgeService,
  ) {}

  onModuleInit() {
    this.bridge.subscribe((event: WsEvent) => {
      switch (event.event) {
        case 'new-post':
          this.gateway.emitNewPost(event.data as any);
          break;
        case 'new-sentiment':
          this.gateway.emitNewSentiment(event.data as any);
          break;
        case 'new-alert':
          this.gateway.emitNewAlert(event.data as any);
          break;
        default:
          this.logger.warn(`Unknown event type: ${event.event}`);
      }
    });
    this.logger.log('🔗 Events listener connected gateway ↔ Redis bridge');
  }
}

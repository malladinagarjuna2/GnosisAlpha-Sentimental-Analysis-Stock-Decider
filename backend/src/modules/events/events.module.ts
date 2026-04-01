// src/modules/events/events.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventsGateway } from './events.gateway';
import { EventsBridgeService } from './events-bridge.service';
import { EventsListenerService } from './events-listener.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [EventsGateway, EventsBridgeService, EventsListenerService],
  exports: [EventsBridgeService],
})
export class EventsModule {}

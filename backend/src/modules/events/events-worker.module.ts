// src/modules/events/events-worker.module.ts
// Worker-only events module — provides EventsBridgeService for publishing.
// Does NOT include WebSocket gateway (that runs only in the HTTP server).
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventsBridgeService } from './events-bridge.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [EventsBridgeService],
  exports: [EventsBridgeService],
})
export class EventsWorkerModule {}

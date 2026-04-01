// src/worker-app.module.ts
// Worker bootstrap module — loads ONLY what workers need. No HTTP controllers.
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule }  from './prisma/prisma.module';
import { QueueModule }   from './queue/queue.module';
import { FetcherModule } from './modules/fetcher/fetcher.module';
import { WorkersModule } from './modules/workers/workers.module';
import { EventsWorkerModule } from './modules/events/events-worker.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,         // global DB
    QueueModule,          // global queues + Redis
    EventsWorkerModule,   // Redis pub/sub for WebSocket events (publish only)
    FetcherModule,        // schedules + produces jobs
    WorkersModule,        // consumes jobs
  ],
})
export class WorkerAppModule {}

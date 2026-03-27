// src/queue/queue.module.ts
// LAYER 1: Queue infrastructure — single source of truth for all BullMQ setup.
// @Global() so any module can @InjectQueue() without re-importing.
import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { POST_QUEUE, SENTIMENT_QUEUE } from '../constants/queue.constants';

@Global()
@Module({
  imports: [
    // Redis connection — configured ONCE here, never again in feature modules
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),

    // All queues registered here — single registration point
    BullModule.registerQueue(
      { name: POST_QUEUE },
      { name: SENTIMENT_QUEUE },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}

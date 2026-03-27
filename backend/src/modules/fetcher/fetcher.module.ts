// src/modules/fetcher/fetcher.module.ts
// LAYER 2: Fetcher module — schedules polling, does NOT consume queues.
import { Module } from '@nestjs/common';
import { FetcherService } from './fetcher.service';
import { SeederService } from './seeder.service';

@Module({
  // QueueModule is @Global() — BullModule + queues already available via DI
  providers: [SeederService, FetcherService],
  exports: [FetcherService],
})
export class FetcherModule {}

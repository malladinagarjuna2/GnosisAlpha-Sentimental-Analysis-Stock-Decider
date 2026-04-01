// src/modules/fetcher/fetcher.module.ts
// LAYER 2: Fetcher module — schedules polling, does NOT consume queues.
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FetcherService } from './fetcher.service';
import { SeederService } from './seeder.service';
import { TwitterFetcherAdapter } from './twitter-fetcher.adapter';
import { ChannelsModule } from '../channels/channels.module';

@Module({
  imports: [ConfigModule, ChannelsModule],
  providers: [SeederService, TwitterFetcherAdapter, FetcherService],
  exports: [FetcherService],
})
export class FetcherModule {}

// src/modules/workers/workers.module.ts
// LAYER 3: Aggregates all BullMQ workers.
// Imported ONLY by worker-app.module.ts — never by the HTTP server app.
import { Module } from '@nestjs/common';
import { PostWorker } from './post.worker';
import { SentimentWorker } from './sentiment.worker';
import { SentimentModule } from '../sentiment/sentiment.module';
import { WhaleModule } from '../whale/whale.module';

// QueueModule is @Global() — no need to import it here, @InjectQueue() works automatically

@Module({
  imports: [
    SentimentModule, // provides SentimentService for SentimentWorker
    WhaleModule,     // provides WhaleService for PostWorker
  ],
  providers: [PostWorker, SentimentWorker],
})
export class WorkersModule {}

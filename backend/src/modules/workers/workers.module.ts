// src/modules/workers/workers.module.ts
// LAYER 3: Aggregates all BullMQ workers.
// Imported ONLY by worker-app.module.ts — never by the HTTP server app.
import { Module } from '@nestjs/common';
import { PostWorker } from './post.worker';
import { SentimentWorker } from './sentiment.worker';
import { SentimentModule } from '../sentiment/sentiment.module';
import { WhaleModule } from '../whale/whale.module';
import { StrategiesModule } from '../strategies/strategies.module';
import { AlertsModule } from '../alerts/alerts.module';
import { UsersModule } from '../users/users.module';

// QueueModule is @Global() — no need to import it here, @InjectQueue() works automatically

@Module({
  imports: [
    SentimentModule,  // provides SentimentService for SentimentWorker
    WhaleModule,      // provides WhaleService for PostWorker
    StrategiesModule, // provides StrategiesService for per-user strategy evaluation
    AlertsModule,     // provides AlertsService + EmailService for alert creation + email
    UsersModule,      // provides UsersService to fetch user email for email alerts
  ],
  providers: [PostWorker, SentimentWorker],
})
export class WorkersModule {}

// src/app.module.ts
// HTTP server module — feature modules + queue infrastructure for the fetcher.
// Workers are NOT loaded here (they run in worker.ts separately).
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService }    from './app.service';

import { PrismaModule }  from './prisma/prisma.module';
import { QueueModule }   from './queue/queue.module';
import { FetcherModule } from './modules/fetcher/fetcher.module';

import { AllExceptionsFilter }  from './common/filters/all-exceptions.filter';
import { LoggingInterceptor }   from './common/interceptors/logging.interceptor';

import { AuthModule }       from './modules/auth/auth.module';
import { UsersModule }      from './modules/users/users.module';
import { AssetsModule }     from './modules/assets/assets.module';
import { PostsModule }      from './modules/posts/posts.module';
import { SentimentModule }  from './modules/sentiment/sentiment.module';
import { AlertsModule }     from './modules/alerts/alerts.module';
import { StrategiesModule } from './modules/strategies/strategies.module';
import { WhaleModule }       from './modules/whale/whale.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { AnalysisModule }   from './modules/analysis/analysis.module';
import { ChannelsModule }   from './modules/channels/channels.module';
import { EventsModule }     from './modules/events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // Infrastructure
    PrismaModule,
    QueueModule,    // global queues — FetcherModule needs @InjectQueue(POST_QUEUE)
    FetcherModule,  // starts the 30s polling scheduler

    // Feature modules (HTTP)
    AuthModule,
    UsersModule,
    AssetsModule,
    PostsModule,
    SentimentModule,
    AlertsModule,
    StrategiesModule,
    WhaleModule,
    PreferencesModule,
    AnalysisModule,
    ChannelsModule,
    EventsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER,       useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR,  useClass: LoggingInterceptor  },
  ],
})
export class AppModule {}

// src/worker.ts
// Worker bootstrap — runs BullMQ processors independently from the HTTP server.
// Start with: npm run start:worker
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerAppModule } from './worker-app.module';

async function bootstrap() {
  const logger = new Logger('Worker');

  // ApplicationContext = NestJS DI container WITHOUT HTTP server
  const app = await NestFactory.createApplicationContext(WorkerAppModule, {
    logger: ['log', 'warn', 'error'],
  });

  // Graceful shutdown on SIGTERM (Docker, K8s, etc.)
  process.on('SIGTERM', async () => {
    logger.warn('SIGTERM received — shutting down worker gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.warn('SIGINT received — shutting down worker gracefully...');
    await app.close();
    process.exit(0);
  });

  logger.log('⚙️  Worker process started — listening for queue jobs');
  logger.log('   ● post-queue: PostProcessor');
  logger.log('   ● sentiment-queue: SentimentProcessor');
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal worker error:', err);
  process.exit(1);
});

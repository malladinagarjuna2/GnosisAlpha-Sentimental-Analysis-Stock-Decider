// src/modules/fetcher/fetcher.controller.ts
// Provides HTTP endpoints to control the fetcher from the frontend/Postman.
//
//  POST /api/fetcher/refresh  — triggers an immediate fetch cycle in the worker
//  GET  /api/fetcher/status   — returns last fetched time per channel
//
import { Controller, Post, Get, UseGuards, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser, AuthUser } from '../../common/decorators/get-user.decorator';
import { FetcherService } from './fetcher.service';
import { FETCHER_CONTROL_QUEUE, TRIGGER_FETCH_JOB } from '../../constants/queue.constants';

@Controller('fetcher')
@UseGuards(JwtAuthGuard)
export class FetcherController {
  private readonly logger = new Logger(FetcherController.name);

  constructor(
    @InjectQueue(FETCHER_CONTROL_QUEUE) private readonly controlQueue: Queue,
    private readonly fetcherService: FetcherService,
  ) {}

  /**
   * POST /api/fetcher/refresh
   * Enqueues a TRIGGER_FETCH_JOB in the worker — the worker's FetcherRefreshWorker
   * will call fetcherService.poll() immediately, fetching only posts newer than
   * lastFetchedAt for each channel.
   */
  @Post('refresh')
  async refresh(@GetUser() user: AuthUser) {
    this.logger.log(`🔄 Manual refresh requested by user=${user.userId}`);

    const job = await this.controlQueue.add(
      TRIGGER_FETCH_JOB,
      { requestedBy: user.userId, requestedAt: new Date().toISOString() },
      { removeOnComplete: true, removeOnFail: 3, attempts: 1 },
    );

    return {
      status:      'triggered',
      jobId:       job.id,
      message:     'Fetch job dispatched to worker — new posts will appear in /api/posts within seconds',
      requestedAt: new Date().toISOString(),
    };
  }

  /**
   * GET /api/fetcher/status
   * Returns the last successful fetch time per channel (from the HTTP server's
   * in-memory state — since the HTTP server also runs FetcherService for seeding).
   * Note: for real lastFetchedAt, check the worker process — it holds the live state.
   */
  @Get('status')
  getStatus() {
    return {
      ...this.fetcherService.getStatus(),
      message: 'lastFetchedAt reflects the HTTP server process — worker process tracks the live state',
    };
  }
}

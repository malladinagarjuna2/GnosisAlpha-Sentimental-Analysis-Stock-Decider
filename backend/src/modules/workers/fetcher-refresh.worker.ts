// src/modules/workers/fetcher-refresh.worker.ts
// Listens on fetcher-control-queue for TRIGGER_FETCH_JOB jobs.
// When the HTTP server's POST /api/fetcher/refresh is called, it enqueues a job
// here — the worker immediately calls fetcherService.poll() to ingest new posts.
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { FetcherService } from '../fetcher/fetcher.service';
import { FETCHER_CONTROL_QUEUE, TRIGGER_FETCH_JOB } from '../../constants/queue.constants';

@Processor(FETCHER_CONTROL_QUEUE)
export class FetcherRefreshWorker extends WorkerHost {
  private readonly logger = new Logger(FetcherRefreshWorker.name);

  constructor(private readonly fetcher: FetcherService) {
    super();
  }

  async process(job: Job): Promise<{ enqueued: number }> {
    if (job.name !== TRIGGER_FETCH_JOB) return { enqueued: 0 };

    this.logger.log(`🔄 Manual refresh triggered (job=${job.id})`);
    const result = await this.fetcher.poll();
    this.logger.log(`🔄 Manual refresh complete — enqueued ${result.enqueued} posts`);
    return result;
  }
}

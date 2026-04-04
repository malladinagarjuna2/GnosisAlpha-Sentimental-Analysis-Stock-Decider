// src/prisma/prisma.service.ts
// Prisma v7 uses the "client" engine which requires a driver adapter.
// We use @prisma/adapter-pg (pg Pool) as the PostgreSQL adapter.
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly prismaClient: PrismaClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // PrismaPg creates a pg Pool under the hood from the connection string
    const adapter = new PrismaPg({ connectionString });

    this.prismaClient = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  // Model accessor proxies — ergonomic API: this.prisma.user.findMany(...)
  get user()            { return this.prismaClient.user; }
  get asset()           { return this.prismaClient.asset; }
  get userPreference()  { return this.prismaClient.userPreference; }
  get post()            { return this.prismaClient.post; }
  get sentimentResult() { return this.prismaClient.sentimentResult; }
  get strategy()        { return this.prismaClient.strategy; }
  get alert()           { return this.prismaClient.alert; }
  get socialChannel()   { return this.prismaClient.socialChannel; }
  get userChannel()     { return this.prismaClient.userChannel; }
  get investorProfile() { return this.prismaClient.investorProfile; }

  get $transaction()    { return this.prismaClient.$transaction.bind(this.prismaClient); }

  async onModuleInit() {
    await this.prismaClient.$connect();
    this.logger.log('✅ Prisma connected to PostgreSQL (via pg adapter)');
  }

  async onModuleDestroy() {
    await this.prismaClient.$disconnect();
    this.logger.log('Prisma disconnected');
  }
}

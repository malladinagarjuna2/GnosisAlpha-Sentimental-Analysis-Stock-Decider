// src/modules/posts/posts.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PostSource } from '@prisma/client';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  findByAsset(assetId: string, limit = 50) {
    return this.prisma.post.findMany({
      where: { assetId },
      include: { sentiment: true },
      orderBy: { postedAt: 'desc' },
      take: limit,
    });
  }

  findById(id: string) {
    return this.prisma.post.findUnique({
      where: { id },
      include: { sentiment: true, asset: true },
    });
  }

  // Used by ingestion workers
  upsert(data: {
    assetId: string;
    source: PostSource;
    externalId: string;
    content: string;
    author?: string;
    url?: string;
    postedAt: Date;
  }) {
    return this.prisma.post.upsert({
      where: { externalId: data.externalId },
      create: data,
      update: {},
    });
  }
}

// src/modules/posts/posts.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PostSource, Prisma } from '@prisma/client';
import type { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  /** List posts with optional filters: assetId, source, limit */
  findAll(filters: { assetId?: string; source?: PostSource; limit?: number }) {
    const where: Prisma.PostWhereInput = {};
    if (filters.assetId) where.assetId = filters.assetId;
    if (filters.source) where.source = filters.source;

    return this.prisma.post.findMany({
      where,
      include: { sentiment: true, asset: true },
      orderBy: { postedAt: 'desc' },
      take: filters.limit ?? 50,
    });
  }

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

  /** Manual post creation for testing purposes */
  async create(dto: CreatePostDto) {
    // Verify asset exists
    const asset = await this.prisma.asset.findUnique({ where: { id: dto.assetId } });
    if (!asset) throw new NotFoundException('Asset not found');

    return this.prisma.post.create({
      data: {
        assetId: dto.assetId,
        source: dto.source,
        externalId: `manual-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        content: dto.content,
        author: dto.author ?? 'manual-entry',
        url: dto.url,
        postedAt: dto.postedAt ? new Date(dto.postedAt) : new Date(),
      },
      include: { asset: true },
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

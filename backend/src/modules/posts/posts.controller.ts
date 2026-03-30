// src/modules/posts/posts.controller.ts
import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PostSource } from '@prisma/client';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  /** GET /api/posts?assetId=...&source=TWITTER&limit=50 — list posts with filters */
  @Get()
  findAll(
    @Query('assetId') assetId?: string,
    @Query('source') source?: PostSource,
    @Query('limit') limit?: string,
  ) {
    return this.postsService.findAll({
      assetId,
      source,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /** GET /api/posts/asset/:assetId — list posts for a specific asset */
  @Get('asset/:assetId')
  findByAsset(
    @Param('assetId') assetId: string,
    @Query('limit') limit?: string,
  ) {
    return this.postsService.findByAsset(assetId, limit ? parseInt(limit, 10) : 50);
  }

  /** GET /api/posts/:id — get a single post */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findById(id);
  }

  /** POST /api/posts — manually insert a post (for testing) */
  @Post()
  create(@Body() dto: CreatePostDto) {
    return this.postsService.create(dto);
  }
}

// src/modules/posts/posts.controller.ts
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PostsService } from './posts.service';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get('asset/:assetId')
  findByAsset(
    @Param('assetId') assetId: string,
    @Query('limit') limit?: string,
  ) {
    return this.postsService.findByAsset(assetId, limit ? parseInt(limit, 10) : 50);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findById(id);
  }
}

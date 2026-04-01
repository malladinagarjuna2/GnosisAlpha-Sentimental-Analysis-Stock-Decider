// src/modules/assets/assets.controller.ts
import {
  Controller, Get, Post, Delete, Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { GetUser, AuthUser } from '../../common/decorators/get-user.decorator';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  /** GET /api/assets — public, list all assets */
  @Get()
  findAll() {
    return this.assetsService.findAll();
  }

  /**
   * MUST come before :id route to avoid Express matching "tracked" as an id param.
   * GET /api/assets/tracked/me — get assets tracked by the current user
   */
  @UseGuards(JwtAuthGuard)
  @Get('tracked/me')
  getTracked(@GetUser() user: AuthUser) {
    return this.assetsService.findByUser(user.userId);
  }

  /** GET /api/assets/:id */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findById(id);
  }

  /** POST /api/assets — create an asset (authenticated) */
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  /** POST /api/assets/add — user selects/tracks an asset (step 3 spec) */
  @UseGuards(JwtAuthGuard)
  @Post('add')
  addAsset(@Body('assetId') assetId: string, @GetUser() user: AuthUser) {
    return this.assetsService.trackAsset(user.userId, assetId);
  }

  /** DELETE /api/assets/remove — user removes a tracked asset (step 3 spec) */
  @UseGuards(JwtAuthGuard)
  @Delete('remove')
  removeAsset(@Body('assetId') assetId: string, @GetUser() user: AuthUser) {
    return this.assetsService.untrackAsset(user.userId, assetId);
  }

  /** POST /api/assets/:id/track — track an asset (legacy) */
  @UseGuards(JwtAuthGuard)
  @Post(':id/track')
  @HttpCode(HttpStatus.OK)
  track(@Param('id') id: string, @GetUser() user: AuthUser) {
    return this.assetsService.trackAsset(user.userId, id);
  }

  /** DELETE /api/assets/:id/track — stop tracking (legacy) */
  @UseGuards(JwtAuthGuard)
  @Delete(':id/track')
  @HttpCode(HttpStatus.NO_CONTENT)
  untrack(@Param('id') id: string, @GetUser() user: AuthUser) {
    return this.assetsService.untrackAsset(user.userId, id);
  }
}

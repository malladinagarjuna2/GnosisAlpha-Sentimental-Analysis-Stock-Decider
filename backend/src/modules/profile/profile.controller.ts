// src/modules/profile/profile.controller.ts
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser, AuthUser } from '../../common/decorators/get-user.decorator';
import { ProfileService } from './profile.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /** POST /api/profile — create or update investor profile (onboarding) */
  @Post()
  upsert(@GetUser() user: AuthUser, @Body() dto: UpsertProfileDto) {
    return this.profileService.upsert(user.userId, dto);
  }

  /** GET /api/profile — get current investor profile */
  @Get()
  findMine(@GetUser() user: AuthUser) {
    return this.profileService.findByUser(user.userId);
  }
}

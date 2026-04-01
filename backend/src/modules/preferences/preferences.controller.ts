// src/modules/preferences/preferences.controller.ts
import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser, AuthUser } from '../../common/decorators/get-user.decorator';
import { PreferencesService } from './preferences.service';
import { UpdatePreferenceDto } from './dto/update-preference.dto';

@UseGuards(JwtAuthGuard)
@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  /** GET /api/preferences — fetch all user preferences */
  @Get()
  findAll(@GetUser() user: AuthUser) {
    return this.preferencesService.findByUser(user.userId);
  }

  /** POST /api/preferences — create or update a preference */
  @Post()
  upsert(@GetUser() user: AuthUser, @Body() dto: UpdatePreferenceDto) {
    return this.preferencesService.upsert(user.userId, dto);
  }

  /** PATCH /api/preferences/:assetId/toggle-alert — toggle alertEnabled */
  @Patch(':assetId/toggle-alert')
  toggleAlert(@GetUser() user: AuthUser, @Param('assetId') assetId: string) {
    return this.preferencesService.toggleAlert(user.userId, assetId);
  }
}

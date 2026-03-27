// src/modules/strategies/strategies.controller.ts
import {
  Controller, Get, Post, Put, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser, AuthUser } from '../../common/decorators/get-user.decorator';
import { StrategiesService } from './strategies.service';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';

@Controller('strategies')
@UseGuards(JwtAuthGuard)
export class StrategiesController {
  constructor(private readonly strategiesService: StrategiesService) {}

  /** GET /api/strategies — list current user's strategies */
  @Get()
  findAll(@GetUser() user: AuthUser) {
    return this.strategiesService.findByUser(user.userId);
  }

  /** GET /api/strategies/:id */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.strategiesService.findById(id);
  }

  /** POST /api/strategies */
  @Post()
  create(@GetUser() user: AuthUser, @Body() dto: CreateStrategyDto) {
    return this.strategiesService.create(user.userId, dto);
  }

  /** PUT /api/strategies/:id */
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStrategyDto) {
    return this.strategiesService.update(id, dto);
  }

  /** DELETE /api/strategies/:id */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.strategiesService.delete(id);
  }
}

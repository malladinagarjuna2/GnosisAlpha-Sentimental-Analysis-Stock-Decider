// src/modules/channels/channels.controller.ts
import { Controller, Get, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { FollowChannelDto } from './dto/follow-channel.dto';
import { CreateChannelDto } from './dto/create-channel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser, AuthUser } from '../../common/decorators/get-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  /** GET /channels — list all default + user's custom channels */
  @Get()
  listAvailable(@GetUser() user: AuthUser) {
    return this.channelsService.listAvailable(user.userId);
  }

  /** GET /channels/followed — list channels the user is following */
  @Get('followed')
  listFollowed(@GetUser() user: AuthUser) {
    return this.channelsService.listFollowed(user.userId);
  }

  /** POST /channels/follow — follow a channel by ID */
  @Post('follow')
  follow(@GetUser() user: AuthUser, @Body() dto: FollowChannelDto) {
    return this.channelsService.follow(user.userId, dto.channelId);
  }

  /** DELETE /channels/unfollow — unfollow a channel */
  @Delete('unfollow')
  unfollow(@GetUser() user: AuthUser, @Body() dto: FollowChannelDto) {
    return this.channelsService.unfollow(user.userId, dto.channelId);
  }

  /** POST /channels/custom — add a custom channel (handle) and auto-follow it */
  @Post('custom')
  addCustom(@GetUser() user: AuthUser, @Body() dto: CreateChannelDto) {
    return this.channelsService.addCustom(user.userId, dto);
  }
}

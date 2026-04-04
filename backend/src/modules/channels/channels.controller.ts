// src/modules/channels/channels.controller.ts
import { Controller, Get, Post, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { FollowChannelDto } from './dto/follow-channel.dto';
import { CreateChannelDto } from './dto/create-channel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser, AuthUser } from '../../common/decorators/get-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

// Asset → relevant trusted channels mapping
const CHANNEL_RECS: Record<string, string[]> = {
  RELIANCE:   ['CNBCTV18Live', 'livemint', 'EconomicTimes', 'NDTVProfit'],
  TCS:        ['CNBCTV18Live', 'livemint', 'EconomicTimes', 'business'],
  INFY:       ['CNBCTV18Live', 'livemint', 'EconomicTimes', 'business'],
  HDFCBANK:   ['CNBCTV18Live', 'livemint', 'NDTVProfit', 'Reuters'],
  ICICIBANK:  ['CNBCTV18Live', 'livemint', 'NDTVProfit', 'Reuters'],
  SBIN:       ['CNBCTV18Live', 'livemint', 'NDTVProfit', 'BSEIndia'],
  WIPRO:      ['CNBCTV18Live', 'EconomicTimes', 'business'],
  TATAMOTORS: ['CNBCTV18Live', 'livemint', 'NDTVProfit', 'EconomicTimes'],
  BAJFINANCE: ['CNBCTV18Live', 'livemint', 'NDTVProfit'],
  LT:         ['CNBCTV18Live', 'livemint', 'EconomicTimes'],
};

@UseGuards(JwtAuthGuard)
@Controller('channels')
export class ChannelsController {
  constructor(
    private readonly channelsService: ChannelsService,
    private readonly prisma: PrismaService,
  ) {}

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

  /**
   * GET /channels/recommended?assets=RELIANCE,TCS
   * Returns trusted channels relevant to the specified assets.
   */
  @Get('recommended')
  async recommended(@Query('assets') assetsParam: string) {
    const assets = (assetsParam ?? '').split(',').map(a => a.trim().toUpperCase()).filter(Boolean);
    
    // Collect unique recommended handles
    const handles = new Set<string>();
    for (const asset of assets) {
      for (const handle of (CHANNEL_RECS[asset] ?? [])) {
        handles.add(handle);
      }
    }
    // Always recommend core market channels
    handles.add('BSEIndia');
    handles.add('NSEIndia');

    // Fetch channel records from DB
    const channels = await this.prisma.socialChannel.findMany({
      where: { handle: { in: [...handles] } },
    });

    return {
      assets,
      recommended: channels,
      note: 'These are pre-verified trusted financial news channels. Follow them for better sentiment analysis.',
    };
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

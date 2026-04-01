// src/modules/channels/channels.service.ts
import { Injectable, Logger, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateChannelDto } from './dto/create-channel.dto';
import type { SocialPlatform } from '@prisma/client';

const MAX_USER_CHANNELS = 15;

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** List all default channels + user's custom channels */
  async listAvailable(userId: string) {
    const [defaults, custom] = await Promise.all([
      this.prisma.socialChannel.findMany({ where: { isDefault: true } }),
      this.prisma.socialChannel.findMany({ where: { createdByUserId: userId } }),
    ]);
    return { defaults, custom };
  }

  /** List channels the user is currently following */
  async listFollowed(userId: string) {
    const userChannels = await this.prisma.userChannel.findMany({
      where: { userId },
      include: { channel: true },
    });
    return userChannels.map(uc => uc.channel);
  }

  /** Follow a channel */
  async follow(userId: string, channelId: string) {
    // Check cap
    const count = await this.prisma.userChannel.count({ where: { userId } });
    if (count >= MAX_USER_CHANNELS) {
      throw new BadRequestException(`Maximum ${MAX_USER_CHANNELS} channels allowed`);
    }

    // Verify channel exists
    const channel = await this.prisma.socialChannel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('Channel not found');

    try {
      return await this.prisma.userChannel.create({
        data: { userId, channelId },
        include: { channel: true },
      });
    } catch {
      throw new ConflictException('Already following this channel');
    }
  }

  /** Unfollow a channel */
  async unfollow(userId: string, channelId: string) {
    const existing = await this.prisma.userChannel.findUnique({
      where: { userId_channelId: { userId, channelId } },
    });
    if (!existing) throw new NotFoundException('Not following this channel');

    await this.prisma.userChannel.delete({
      where: { id: existing.id },
    });
    return { message: 'Unfollowed successfully' };
  }

  /** Add a custom channel (e.g. user enters a Twitter handle) */
  async addCustom(userId: string, dto: CreateChannelDto) {
    // Check cap
    const count = await this.prisma.userChannel.count({ where: { userId } });
    if (count >= MAX_USER_CHANNELS) {
      throw new BadRequestException(`Maximum ${MAX_USER_CHANNELS} channels allowed`);
    }

    // Strip @ prefix
    const handle = dto.handle.replace(/^@/, '').trim();

    // Check if channel already exists for this platform+handle
    let channel = await this.prisma.socialChannel.findUnique({
      where: { platform_handle: { platform: dto.platform, handle } },
    });

    if (!channel) {
      channel = await this.prisma.socialChannel.create({
        data: {
          platform: dto.platform,
          handle,
          displayName: dto.displayName ?? handle,
          isDefault: false,
          createdByUserId: userId,
        },
      });
      this.logger.log(`📺 Custom channel created: @${handle} (${dto.platform}) by user [${userId}]`);
    }

    // Auto-follow the channel
    try {
      await this.prisma.userChannel.create({
        data: { userId, channelId: channel.id },
      });
    } catch {
      // Already following — that's fine
    }

    return channel;
  }

  /** Get all unique channel handles for a given platform across all users (for fetcher) */
  async getActiveChannelsByPlatform(platform: SocialPlatform) {
    const channels = await this.prisma.socialChannel.findMany({
      where: {
        platform,
        followers: { some: {} }, // only channels that have at least one follower
      },
    });
    return channels;
  }
}

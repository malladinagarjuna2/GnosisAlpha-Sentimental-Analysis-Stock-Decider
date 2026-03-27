// src/modules/users/users.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser, AuthUser } from '../../common/decorators/get-user.decorator';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** GET /api/users/me — get current authenticated user's profile */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@GetUser() user: AuthUser) {
    return this.usersService.findById(user.userId);
  }
}

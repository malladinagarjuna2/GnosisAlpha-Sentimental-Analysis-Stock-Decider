// src/common/decorators/get-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Authenticated user payload from JWT strategy.
 * Exported as a class (not interface) so isolatedModules + emitDecoratorMetadata works
 * when used as a decorator param type annotation.
 */
export class AuthUser {
  userId: string;
  email: string;
}

/**
 * @GetUser() — extracts the authenticated user from the JWT payload.
 * Usage: @GetUser() user: AuthUser
 */
export const GetUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<Request & { user: AuthUser }>();
    return request.user;
  },
);

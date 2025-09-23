import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Interface for the user object that will be attached to the request
 */
export interface CurrentUserType {
  sub: string;      // Standard JWT subject claim (user ID)
  userId: string;   // Alias for sub (backward compatibility)
  role: string;
  email?: string;
  name?: string;
}

/**
 * Custom decorator to extract the current user from the request object
 * This decorator should be used with the JwtAuthGuard
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserType => {
    const request = ctx.switchToHttp().getRequest();
    
    if (!request.user) {
      throw new Error('CurrentUser decorator used without JwtAuthGuard');
    }
    
    return {
      sub: request.user.sub || request.user.userId,
      userId: request.user.sub || request.user.userId, // For backward compatibility
      role: request.user.role,
      email: request.user.email,
      name: request.user.name,
    };
  },
);

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Public Decorator
 * 
 * This decorator is used to mark a route as public, meaning it can be accessed
 * without authentication. It should be used in conjunction with the JwtAuthGuard.
 * 
 * @example @Public()
 * @returns A metadata decorator
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

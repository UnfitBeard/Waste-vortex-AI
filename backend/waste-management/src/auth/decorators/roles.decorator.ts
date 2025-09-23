import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type Role = 'HOUSEHOLD' | 'SME' | 'DRIVER' | 'RECYCLER' | 'COUNCIL' | 'ADMIN';

/**
 * Roles Decorator
 * 
 * This decorator is used to specify which roles are allowed to access a route.
 * It should be used in conjunction with the RolesGuard.
 * 
 * @param roles The roles that are allowed to access the route
 * @example @Roles('ADMIN', 'MODERATOR')
 * @returns A metadata decorator
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

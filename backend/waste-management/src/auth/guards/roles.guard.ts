import { 
  Injectable, 
  CanActivate, 
  ExecutionContext, 
  ForbiddenException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { CurrentUserType } from '../current-user.decorator';

/**
 * Roles Guard
 * 
 * This guard checks if the current user has the required roles to access a route.
 * It should be used in conjunction with the @Roles() decorator.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get the required roles from the @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles) {
      return true;
    }

    // Get the current user from the request
    const { user } = context.switchToHttp().getRequest<{ user: CurrentUserType }>();

    // If no user is found, deny access
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if the user has any of the required roles
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException(
        `User with role ${user.role} does not have access to this resource`,
      );
    }

    return true;
  }
}

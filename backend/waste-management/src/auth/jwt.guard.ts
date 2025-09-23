import { 
  ExecutionContext, 
  Injectable, 
  UnauthorizedException,
  Logger,
  ForbiddenException
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

/**
 * JWT Authentication Guard
 * 
 * This guard extends the default Passport JWT strategy and adds additional
 * error handling and logging capabilities.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);
  
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Override the default canActivate method to check for public routes
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Check if the route or class is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If the route is public, allow access without authentication
    if (isPublic) {
      return true;
    }

    // Otherwise, proceed with the default JWT authentication
    return super.canActivate(context);
  }

  /**
   * Handle the request and throw appropriate exceptions
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Log authentication attempts
    const request = context.switchToHttp().getRequest();
    this.logger.debug(`Authentication attempt for ${request.path}`);

    // Handle errors (e.g., token expired, invalid token, etc.)
    if (err || !user) {
      const message = info?.message || 'Invalid or expired token';
      this.logger.warn(`Authentication failed: ${message}`);
      
      // Provide more specific error messages when possible
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      } else if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      } else if (info?.name === 'NotBeforeError') {
        throw new UnauthorizedException('Token not yet valid');
      }
      
      throw new UnauthorizedException(message);
    }

    // Attach additional user information to the request if needed
    request.user = user;
    
    return user;
  }
}

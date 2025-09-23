import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string; // user id
  role: string;
  email?: string;
  name?: string;
  type?: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly config: ConfigService) {
    // Get and validate the secret so it's not "string | undefined"
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is missing. Add it to your .env');
    }

    const opts: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret, // <-- guaranteed string
      ignoreExpiration: false,
    };

    super(opts);
  }

  /**
   * Validate the JWT payload and return the user object.
   * This method is called after the token is validated.
   * @param payload The JWT payload
   * @returns The user object that will be attached to the request
   */
  async validate(payload: JwtPayload) {
    // For access tokens, we don't have a type field, but for refresh tokens we do
    // So we only check type if it exists in the payload
    if (payload.type && payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }
    
    return {
      sub: payload.sub, // Standard claim name for user ID
      userId: payload.sub, // Keep for backward compatibility
      role: payload.role,
      email: payload.email,
      name: payload.name,
    };
  }
}

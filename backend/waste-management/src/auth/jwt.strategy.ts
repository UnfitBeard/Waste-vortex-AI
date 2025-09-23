// src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string; // user id
  role: string;
  email?: string;
  name?: string;
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

  // whatever you return becomes req.user
  // eslint-disable-next-line @typescript-eslint/require-await
  async validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      role: payload.role,
      email: payload.email,
      name: payload.name,
    };
  }
}

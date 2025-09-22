/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/await-thenable */
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcryptjs';
import { sign } from 'crypto';
import { use } from 'passport';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
  ) {}

  async register(dto: {
    name: string;
    email: string;
    password: string;
    role: string;
  }) {
    try {
      if (await this.users.existsByEmail(dto.email)) {
        throw new BadRequestException('Email Already Registered');
      }
      const passwordHash = await bcrypt.hash(dto.password, 10);
      const user = await this.users.create({
        name: dto.name,
        email: dto.email,
        role: dto.role as any,
        passwordHash,
      });
      if (!user) throw new Error('User create returned indefinitely');
      return this.sign(user);
    } catch (err) {
      if (err?.code === 11000)
        throw new BadRequestException('Email already registered');
      console.error('[auth.register] error:', err?.message || err);
      throw err;
    }
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.users.findByEmailWithPassword(dto.email);
    if (!user || !user.passwordHash)
      throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.sign(user);
  }

  private sign(user: any) {
    const payload = {
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
    };
    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: payload.sub,
        role: user.role,
        name: user.name,
        email: user.email,
      },
    };
  }
}

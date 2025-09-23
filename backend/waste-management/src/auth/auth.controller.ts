/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Body,
  Controller,
  Post,
  HttpStatus,
  UseGuards,
  Req,
  Get,
  HttpCode,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { JwtAuthGuard } from './jwt.guard';
import { Public } from './decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Create a new user account with the provided information. A verification email will be sent to the provided email address.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully. Verification email sent.',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
        role: {
          type: 'string',
          enum: ['USER', 'ADMIN', 'COLLECTOR', 'RECYCLER', 'HOUSEHOLD'],
        },
        message: {
          type: 'string',
          example:
            'Registration successful! Please check your email to verify your account before logging in.',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already registered',
  })
  @ApiBody({
    type: RegisterDto,
    description: 'User registration data',
    examples: {
      basic: {
        summary: 'Basic registration',
        value: {
          name: 'John Doe',
          email: 'john@example.com',
          password: 'SecurePassword123!',
          role: 'HOUSEHOLD',
        },
      },
    },
  })
  async register(@Body() dto: RegisterDto) {
    try {
      const result = await this.auth.register(dto);
      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Registration error:', error);
      throw new BadRequestException('Registration failed. Please try again.');
    }
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login user',
    description: 'Authenticate user with email and password.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully logged in',
    schema: {
      example: {
        accessToken: 'string',
        refreshToken: 'string',
        user: {
          id: 'string',
          name: 'string',
          email: 'string',
          role: 'USER',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User login credentials',
  })
  async login(@Body() dto: LoginDto) {
    try {
      return await this.auth.login(dto);
    } catch (error) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Request a password reset link to be sent to the provided email.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'If the email is registered, a password reset link will be sent',
    schema: {
      example: {
        message:
          'If your email is registered, you will receive a password reset link',
      },
    },
  })
  @ApiBody({
    type: ForgotPasswordDto,
    description: 'Email address for password reset',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    try {
      return await this.auth.forgotPassword(dto);
    } catch (error) {
      // Don't reveal if the email exists or not for security reasons
      return {
        message:
          'If your email is registered, you will receive a password reset link',
      };
    }
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password with a valid token',
    description: 'Reset the user password using a valid reset token.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password has been reset successfully',
    schema: {
      example: {
        message: 'Password has been reset successfully',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired token',
  })
  @ApiBody({
    type: ResetPasswordDto,
    description: 'Password reset data with token and new password',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    try {
      return await this.auth.resetPassword(dto);
    } catch (error) {
      throw new BadRequestException('Invalid or expired token');
    }
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Get a new access token using a valid refresh token.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'New access token generated',
    schema: {
      example: {
        accessToken: 'string',
        refreshToken: 'string',
        user: {
          id: 'string',
          name: 'string',
          email: 'string',
          role: 'USER',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid refresh token',
  })
  @ApiBody({
    type: RefreshTokenDto,
    description: 'Refresh token data',
  })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    try {
      return await this.auth.refreshToken(dto);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout user',
    description: 'Invalidate the current refresh token.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully logged out',
    schema: {
      example: {
        message: 'Successfully logged out',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - No valid token provided',
  })
  async logout(@Req() req: any) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      await this.auth.logout(req.user.sub, token);
      return { message: 'Successfully logged out' };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Logout failed');
    }
  }
}

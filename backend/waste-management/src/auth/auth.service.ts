import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { MailService } from 'src/mail/mail.service';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { Role } from '../users/schemas/user.schema';
import { RegisterDto } from './dtos/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
    private config: ConfigService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    console.log('\n🔧 Starting user registration for:', dto.email);
    
    try {
      // Check if email already exists
      const emailExists = await this.users.existsByEmail(dto.email);
      if (emailExists) {
        console.log('❌ Registration failed: Email already exists:', dto.email);
        throw new BadRequestException('Email already registered');
      }
      
      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Hash the password
      const passwordHash = await bcrypt.hash(dto.password, 10);
      
      console.log('🔑 Creating user with hashed password and verification token');
      
      // Validate required fields
      const email = dto.email?.toLowerCase().trim();
      if (!email) {
        throw new BadRequestException('Email is required');
      }
      
      // Create user object
      const userData = {
        name: dto.name.trim(),
        email: email,
        role: (dto.role || 'HOUSEHOLD') as Role,
        passwordHash,
        emailVerificationToken,
        emailVerificationExpires,
        isEmailVerified: false,
      };
      
      console.log('📝 User data prepared, creating user in database...');
      
      // Create the user
      const user = await this.users.create(userData);
      
      if (!user) {
        console.error('❌ User creation returned undefined');
        throw new Error('Failed to create user');
      }
      
      console.log('✅ User created successfully:', { userId: user._id, email: user.email });
      
      // Send verification email
      try {
        const frontendUrl = this.config.get('FRONTEND_URL');
        if (!frontendUrl) {
          throw new Error('FRONTEND_URL is not configured');
        }
        
        const verificationUrl = `${frontendUrl}/users/verify-email?token=${emailVerificationToken}`;
        
        console.log('📧 Sending verification email:', {
          to: user.email || 'unknown',
          verificationUrl: `${verificationUrl.substring(0, 50)}...`,
          token: `${emailVerificationToken.substring(0, 5)}...`,
          expiresAt: emailVerificationExpires.toISOString()
        });
        
        if (user.email) {
          await this.mailService.sendEmailVerification(user.email, verificationUrl);
          console.log('✅ Verification email sent successfully to:', user.email);
        } else {
          console.error('❌ Cannot send verification email: User email is undefined');
        }
        
      } catch (emailError) {
        console.error('⚠️ Failed to send verification email:', {
          error: emailError.message,
          userId: user._id,
          timestamp: new Date().toISOString()
        });
        // Don't fail the registration if email sending fails
      }
      
      // Return user data without sensitive information and include verification message
      const { passwordHash: _, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        message: 'Registration successful! Please check your email to verify your account before logging in.'
      };
      
    } catch (err) {
      console.error('❌ Registration failed:', {
        error: err.message,
        email: dto.email,
        timestamp: new Date().toISOString(),
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
      
      if (err.code === 11000) {
        throw new BadRequestException('Email already registered');
      } else if (err instanceof BadRequestException) {
        throw err; // Re-throw existing BadRequestException
      }
      
      throw new InternalServerErrorException('Registration failed. Please try again.');
    }
  }

  async login(dto: { email: string; password: string }) {
    // First, check if user exists
    const user = await this.users.findByEmailWithPassword(dto.email);
    
    // If user doesn't exist or doesn't have a password (social login), throw invalid credentials
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }
    
    // Check if email is verified before checking password
    if (!user.isEmailVerified) {
      // Generate a new verification token if the old one is expired or doesn't exist
      let verificationToken = user.emailVerificationToken;
      if (!verificationToken || !user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
        verificationToken = crypto.randomBytes(32).toString('hex');
        const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        await this.users.update(user._id.toString(), {
          emailVerificationToken: verificationToken,
          emailVerificationExpires,
        });
        
        // Send new verification email
        const frontendUrl = this.config.get('FRONTEND_URL');
        if (frontendUrl && user.email) {
          const verificationUrl = `${frontendUrl}/users/verify-email?token=${verificationToken}`;
          
          // Log email details
          console.log('\n📧 Resending verification email:', {
            to: user.email,
            subject: 'Verify your email',
            verificationUrl,
            token: verificationToken,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          });
          
          await this.mailService.sendEmailVerification(user.email, verificationUrl);
          console.log('✅ Verification email resent successfully to:', user.email);
        }
      }
      
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Please verify your email address before logging in. We\'ve sent a new verification email to your inbox.',
        error: 'Email Not Verified',
        needsVerification: true,
        email: user.email,
        resendVerificationEndpoint: '/users/resend-verification',
        verificationEmailSent: true
      });
    }
    
    // If email is verified, check password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    
    return this.generateAuthTokens(user);
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;
    console.log('\n🔑 Forgot password request received for email:', email);
    
    // Find user with password hash to ensure we have the full user object
    const user = await this.users.findByEmailWithPassword(email);
    
    if (!user || !user.email) {
      console.log('⚠️  Email not found (not revealing this to user for security)');
      // For security reasons, don't reveal if the email exists or not
      return { message: 'If your email is registered, you will receive a password reset link' };
    }
    
    console.log('🔍 User found, generating reset token for:', user.email);
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour
    
    try {
      await this.users.update(user._id.toString(), {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires
      });
      console.log('✅ Reset token generated and stored for user:', user.email);
    } catch (error) {
      console.error('❌ Failed to store reset token:', {
        userId: user._id,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw new InternalServerErrorException('Failed to process password reset request');
    }

    const frontendUrl = this.config.get('FRONTEND_URL');
    if (!frontendUrl) {
      const errorMsg = 'FRONTEND_URL is not configured';
      console.error('❌ Configuration error:', errorMsg);
      throw new InternalServerErrorException('Configuration error');
    }

    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    // Log password reset email details (safely)
    console.log('\n📧 Preparing to send password reset email:', {
      to: user.email,
      resetUrl: `${resetUrl.substring(0, 30)}...`, // Show partial URL for security
      token: `${resetToken.substring(0, 5)}...${resetToken.slice(-5)}`, // Show partial token
      expiresAt: resetExpires.toISOString(),
      timestamp: new Date().toISOString()
    });
    
    try {
      console.log('🔄 Sending password reset email to:', user.email);
      await this.mailService.sendPasswordResetLink(user.email, resetUrl);
      
      console.log('✅ Password reset email sent successfully:', {
        to: user.email,
        timestamp: new Date().toISOString(),
        expiresIn: '1 hour'
      });
      
      return { message: 'If your email is registered, you will receive a password reset link' };
      
    } catch (error) {
      console.error('❌ Failed to send password reset email:', {
        email: user.email,
        error: error.message,
        timestamp: new Date().toISOString(),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
      
      // In production, don't expose the actual error to the client
      throw new InternalServerErrorException('Failed to send password reset email');
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    return this.users.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
  }
  
  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      if (!refreshTokenDto.refreshToken) {
        throw new UnauthorizedException('Refresh token is required');
      }

      const payload = this.jwt.verify(refreshTokenDto.refreshToken, {
        secret: this.config.get('JWT_SECRET'),
      }) as { sub: string; type: string };
      
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }
      
      const user = await this.users.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      
      const isValid = await this.users.validateRefreshToken(payload.sub, refreshTokenDto.refreshToken);
      if (!isValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      
      // Generate new tokens
      const tokens = await this.generateAuthTokens(user);
      
      // Remove the old refresh token
      await this.users.removeRefreshToken(user._id.toString(), refreshTokenDto.refreshToken);
      
      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
  
  async logout(userId: string, refreshToken: string) {
    await this.users.removeRefreshToken(userId, refreshToken);
    return { message: 'Successfully logged out' };
  }
  
  /**
   * Generate access and refresh tokens for a user
   * @param user The user object
   * @returns Object containing access token, refresh token, and user info
   */
  private async generateAuthTokens(user: { _id: Types.ObjectId; email?: string; role?: string; name?: string }) {
    const accessTokenPayload = {
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
      type: 'access',
    };
    
    const refreshTokenPayload = {
      ...accessTokenPayload,
      type: 'refresh',
    };
    
    const accessToken = this.jwt.sign(accessTokenPayload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRATION') || '15m',
    });
    
    const refreshToken = this.jwt.sign(refreshTokenPayload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRATION') || '7d',
    });
    
    // Store the refresh token in the database
    const refreshExpiration = this.config.get('JWT_REFRESH_EXPIRATION');
    await this.users.addRefreshToken(
      user._id.toString(),
      refreshToken,
      refreshExpiration ? parseInt(refreshExpiration) : 7 * 24 * 60 * 60, // 7 days in seconds
    );
    
    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}

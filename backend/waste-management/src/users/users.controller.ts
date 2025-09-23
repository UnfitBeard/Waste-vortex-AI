import { 
  Controller, 
  Get, 
  UseGuards, 
  Put, 
  Post, 
  Body, 
  Query, 
  HttpCode, 
  HttpStatus, 
  UseInterceptors, 
  ClassSerializerInterceptor, 
  BadRequestException, 
  UnauthorizedException,
  InternalServerErrorException,
  NotFoundException,
  Res,
  Response
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiBody 
} from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/current-user.decorator';
import type { CurrentUserType } from 'src/auth/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { Public } from 'src/auth/decorators/public.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Unauthorized' })
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns the authenticated user\'s profile' })
  @ApiResponse({ status: 400, description: 'Invalid user ID' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfile(@CurrentUser() user: CurrentUserType) {
    console.log('🔍 [getProfile] Current user from JWT:', {
      sub: user.sub,
      userId: user.userId,
      email: user.email,
      role: user.role
    });

    if (!user.sub) {
      console.error('❌ [getProfile] No user ID found in JWT token');
      throw new BadRequestException('Invalid user ID in token');
    }

    try {
      // Try to find the user by ID first
      console.log(`🔍 [getProfile] Looking up user with ID: ${user.sub}`);
      const freshUser = await this.usersService.findById(user.sub);
      
      if (!freshUser) {
        console.error(`❌ [getProfile] User not found with ID: ${user.sub}`);
        
        // If not found by ID, try to find by email as a fallback
        if (user.email) {
          console.log(`🔍 [getProfile] Trying to find user by email: ${user.email}`);
          const userByEmail = await this.usersService.findByEmailWithPassword(user.email);
          
          if (userByEmail) {
            console.log(`⚠️ [getProfile] Found user by email but ID mismatch!`, {
              jwtId: user.sub,
              dbId: userByEmail._id,
              email: userByEmail.email
            });
            
            // This suggests the JWT token has an incorrect user ID
            throw new BadRequestException('User ID mismatch. Please log in again.');
          }
        }
        
        throw new NotFoundException('User not found');
      }
      
      console.log(`✅ [getProfile] Found user:`, {
        _id: freshUser._id,
        email: freshUser.email,
        role: freshUser.role,
        idType: typeof freshUser._id,
        idString: freshUser._id?.toString()
      });
      
      return freshUser;
    } catch (error) {
      console.error('❌ [getProfile] Error fetching user profile:', {
        userId: user.sub,
        email: user.email,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
      
      // If it's a known error type, rethrow it
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      // For other errors, throw a generic error to avoid leaking sensitive information
      throw new InternalServerErrorException('Failed to fetch user profile');
    }
  }

  @Public()
  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email using token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async verifyEmail(@Query('token') token: string) {
    const user = await this.usersService.verifyEmail(token);
    return { message: 'Email verified successfully' };
  }

  @Public()
  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({ 
    status: 200, 
    description: 'Verification email sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ 
    status: 202, 
    description: 'Email not found or already verified',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  })
  @ApiBody({
    description: 'Email to resend verification to',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
      },
      required: ['email'],
    },
  })
  @HttpCode(200)
  async resendVerification(@Body('email') email: string) {
    const result = await this.usersService.resendVerificationEmail(email);
    
    // Return the result with appropriate status code in the response
    return result;
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiBody({ type: UpdateProfileDto })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    try {
      // Use user.sub (standard) or fall back to user.userId (backward compatible)
      const userId = user?.sub || user?.userId;
      
      if (!userId) {
        throw new BadRequestException('User ID not found in token');
      }
      
      const updatedUser = await this.usersService.updateProfile(
        userId,
        updateProfileDto,
      );
      return updatedUser;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw new BadRequestException(error.message || 'Failed to update profile');
    }
  }

  @Post('me/change-password')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiBody({ type: ChangePasswordDto })
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    try {
      const result = await this.usersService.changePassword(
        user.sub,
        changePasswordDto,
      );
      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}

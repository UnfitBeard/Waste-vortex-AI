import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument, IUser, User as UserType } from './schemas/user.schema';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { IUsersService } from './users.service.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly model: Model<UserDocument>,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async create(data: Partial<IUser>): Promise<IUser> {
    console.log('🔍 [UsersService] Creating new user with data:', {
      email: data.email,
      role: data.role,
      name: data.name,
      hasPassword: !!data.passwordHash
    });
    
    try {
      // Create a new user document
      const user = new this.model({
        ...data,
        _id: new Types.ObjectId(), // Explicitly set _id
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('💾 [UsersService] Saving new user to database...');
      
      // Save the document
      const savedUser = await user.save();
      
      console.log('✅ [UsersService] User created successfully:', {
        _id: savedUser._id,
        email: savedUser.email,
        idType: typeof savedUser._id,
        idString: savedUser._id.toString()
      });
      
      // Convert to plain object and remove sensitive data
      const userObj = savedUser.toObject();
      delete userObj.passwordHash;
      
      return userObj as IUser;
    } catch (error) {
      console.error('❌ [UsersService] Error creating user:', {
        error: error.message,
        code: error.code,
        email: data.email,
        stack: error.stack
      });
      
      if (error.code === 11000) {
        console.error('❌ [UsersService] Duplicate email detected:', data.email);
        throw new BadRequestException('Email already exists');
      }
      
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async update(id: string, updateData: Partial<UserType>) {
    console.log(`\n🔄 [UsersService] Updating user ${id} with data:`, JSON.stringify(updateData, null, 2));
    
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    // First, verify the user exists
    const userExists = await this.model.exists({ _id: new Types.ObjectId(id) });
    if (!userExists) {
      console.error(`❌ [UsersService] User not found with id: ${id}`);
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    // Create a copy of updateData to avoid modifying the original
    const update = { ...updateData };
    
    // Handle password reset token
    if (update.resetPasswordToken) {
      console.log('🔑 Reset password token update detected');
      if (!update.resetPasswordExpires) {
        // Set default expiration to 1 hour if not provided
        update.resetPasswordExpires = new Date(Date.now() + 3600000);
      }
    }
    
    // Handle email updates
    if (update.email) {
      console.log('📧 Email update detected, generating verification token');
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      update.emailVerificationToken = verificationToken;
      update.emailVerificationExpires = verificationExpires;
      update.isEmailVerified = false;
    }
    
    try {
      // First try to update and return the document in one operation
      let updatedUser = await this.model.findOneAndUpdate(
        { _id: new Types.ObjectId(id) },
        { $set: update },
        { new: true, runValidators: true }
      );
      
      // If that fails, try a two-step approach
      if (!updatedUser) {
        console.log('⚠️  First update attempt failed, trying alternative approach...');
        const result = await this.model.updateOne(
          { _id: new Types.ObjectId(id) },
          { $set: update },
          { runValidators: true }
        );
        
        if (result.matchedCount === 0) {
          throw new NotFoundException(`User with ID ${id} not found`);
        }
        
        // Try to fetch the user separately
        updatedUser = await this.model.findById(id);
      }
      
      // If we still don't have the user, log a warning but don't fail
      if (!updatedUser) {
        console.warn(`⚠️  [UsersService] Unable to fetch updated user ${id}, but update was successful`);
        // Return a minimal user object with just the ID
        return { _id: new Types.ObjectId(id), ...update } as any;
      }
      
      console.log('✅ [UsersService] User updated successfully:', {
        userId: updatedUser._id,
        updatedFields: Object.keys(update)
      });
      
      return updatedUser;
      
    } catch (error) {
      console.error('❌ [UsersService] Error updating user:', {
        error: error.message,
        userId: id,
        stack: error.stack
      });
      
      if (error.code === 11000) {
        throw new BadRequestException('Email already in use');
      }
      
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  async findById(id: string): Promise<IUser> {
    console.log(`🔍 [UsersService] findById called with ID: ${id}`);
    
    if (!Types.ObjectId.isValid(id)) {
      console.error(`❌ [UsersService] Invalid ObjectId format: ${id}`);
      throw new BadRequestException('Invalid user ID format');
    }
    
    try {
      // Convert string ID to ObjectId for the query
      const objectId = new Types.ObjectId(id);
      console.log(`🔍 [UsersService] Converted ID to ObjectId: ${objectId}`);
      
      // Try to find the user by _id
      const user = await this.model.findById(objectId).lean();
      
      if (!user) {
        console.error(`❌ [UsersService] User not found with ID: ${id} (ObjectId: ${objectId})`);
        // Try to find any user with the ID as string (for debugging)
        const allUsers = await this.model.find({}).lean();
        console.log('🔍 [UsersService] All users in database:', 
          allUsers.map(u => ({ id: u._id.toString(), email: u.email })));
          
        throw new NotFoundException('User not found in database');
      }
      
      console.log(`✅ [UsersService] Found user:`, { 
        _id: user._id, 
        email: user.email,
        idType: typeof user._id,
        idString: user._id.toString()
      });
      
      return user;
    } catch (error) {
      console.error(`❌ [UsersService] Error in findById:`, {
        error: error.message,
        stack: error.stack,
        id,
        idType: typeof id
      });
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Error retrieving user');
    }
  }

  async findByEmailWithPassword(email: string): Promise<IUser | null> {
    if (!email) {
      console.error('❌ [UsersService] No email provided to findByEmailWithPassword');
      return null;
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    console.log(`🔍 [UsersService] findByEmailWithPassword: Searching for email: ${normalizedEmail}`);
    
    try {
      const user = await this.model
        .findOne({ email: normalizedEmail })
        .select('+passwordHash')
        .lean();
      
      if (user) {
        console.log(`✅ [UsersService] Found user by email:`, { 
          _id: user._id, 
          email: user.email,
          idType: typeof user._id,
          idString: user._id.toString()
        });
      } else {
        console.log(`❌ [UsersService] No user found with email: ${normalizedEmail}`);
      }
      
      return user as IUser | null;
    } catch (error) {
      console.error(`❌ [UsersService] Error in findByEmailWithPassword:`, {
        email: normalizedEmail,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.model.countDocuments({ email: email?.toLowerCase().trim() });
    return count > 0;
  }

  async updateProfile(userId: string, updateData: UpdateProfileDto): Promise<IUser> {
    console.log(`🔍 [updateProfile] Updating profile for user ID: ${userId}`);
    
    try {
      // Validate user ID format
      if (!Types.ObjectId.isValid(userId)) {
        console.error(`❌ [updateProfile] Invalid ObjectId format: ${userId}`);
        throw new BadRequestException('Invalid user ID format');
      }
      
      // Convert string ID to ObjectId for the query
      const objectId = new Types.ObjectId(userId);
      console.log(`🔍 [updateProfile] Converted ID to ObjectId: ${objectId}`);
      
      // Find the user first
      const user = await this.model.findById(objectId);
      if (!user) {
        console.error(`❌ [updateProfile] User not found with ID: ${userId}`);
        // For debugging: log all users (email and ID only)
        const allUsers = await this.model.find({}, 'email').lean();
        console.log('🔍 [updateProfile] All users in database:', 
          allUsers.map(u => ({ id: u._id.toString(), email: u.email })));
        
        throw new NotFoundException('User not found');
      }
      
      console.log(`🔍 [updateProfile] Found user: ${user.email} (${user._id})`);
      
      const update: any = {};
      
      // Update name if provided
      if (updateData.name) {
        update.name = updateData.name;
        console.log(`📝 [updateProfile] Updating name to: ${updateData.name}`);
      }
      
      // Handle email update if needed
      if (updateData.email && updateData.email !== user.email) {
        console.log(`📧 [updateProfile] Email change requested from ${user.email} to ${updateData.email}`);
        
        const emailExists = await this.existsByEmail(updateData.email);
        if (emailExists) {
          console.error(`❌ [updateProfile] Email already in use: ${updateData.email}`);
          throw new BadRequestException('Email already in use');
        }
        
        update.email = updateData.email.toLowerCase().trim();
        update.isEmailVerified = false;
        
        // Generate new verification token
        update.emailVerificationToken = crypto.randomBytes(32).toString('hex');
        update.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        console.log(`🔑 [updateProfile] Generated new email verification token for ${update.email}`);
      }
      
      // If there's nothing to update, return the current user
      if (Object.keys(update).length === 0) {
        console.log(`ℹ️ [updateProfile] No changes to update for user ${userId}`);
        return user.toObject();
      }
      
      // Perform the update
      console.log(`🔄 [updateProfile] Updating user ${userId} with data:`, update);
      
      const updatedUser = await this.model.findByIdAndUpdate(
        objectId,
        { $set: update },
        { new: true, lean: true }
      );
      
      if (!updatedUser) {
        console.error(`❌ [updateProfile] Failed to update user ${userId} - no user returned`);
        throw new InternalServerErrorException('Failed to update user');
      }
      
      console.log(`✅ [updateProfile] Successfully updated user ${userId}`);
      
      // Send verification email if email was updated
      if (update.emailVerificationToken && updatedUser.email) {
        try {
          const verificationUrl = `${this.config.get('FRONTEND_URL')}/users/verify-email?token=${update.emailVerificationToken}`;
          await this.mailService.sendEmailVerification(
            updatedUser.email,
            verificationUrl
          );
          console.log(`📧 [updateProfile] Sent verification email to ${updatedUser.email}`);
        } catch (emailError) {
          console.error(`❌ [updateProfile] Failed to send verification email:`, emailError);
          // Don't fail the request if email sending fails
        }
      }
      
      return updatedUser as IUser;
      
    } catch (error) {
      console.error(`❌ [updateProfile] Error updating user ${userId}:`, error);
      
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error; // Re-throw specific HTTP exceptions
      }
      
      // For other errors, throw a generic server error
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'An unknown error occurred while updating the user'
      );
    }
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    try {
      // Convert string ID to ObjectId for more reliable lookup
      const user = await this.model.findById(new Types.ObjectId(userId)).select('+passwordHash');
      
      if (!user) {
        console.error(`❌ [changePassword] User not found with ID: ${userId}`);
        throw new NotFoundException('User not found');
      }

      // Check if user has a password (might be using OAuth)
      if (!user.passwordHash) {
        console.error(`❌ [changePassword] No password set for user: ${user.email}`);
        throw new BadRequestException('No password set for this account. Please use the password reset flow.');
      }
      
      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        changePasswordDto.currentPassword,
        user.passwordHash,
      );

      if (!isPasswordValid) {
        console.error(`❌ [changePassword] Invalid current password for user: ${user.email}`);
        throw new BadRequestException('Current password is incorrect');
      }

      // Update password
      const passwordHash = await bcrypt.hash(changePasswordDto.newPassword, 10);
      user.passwordHash = passwordHash;
      await user.save();
      
      console.log(`✅ [changePassword] Password updated successfully for user: ${user.email}`);
      
    } catch (error) {
      console.error(`❌ [changePassword] Error changing password for user ${userId}:`, error);
      
      // Re-throw known exceptions
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      // For other errors, throw a generic error
      throw new InternalServerErrorException('Failed to change password. Please try again.');
    }
  }

  async setPasswordResetToken(email: string, token: string, expires: Date): Promise<void> {
    const result = await this.model.updateOne(
      { email: email.toLowerCase().trim() },
      { 
        $set: { 
          resetPasswordToken: token,
          resetPasswordExpires: expires
        } 
      }
    );
    
    if (result.matchedCount === 0) {
      throw new NotFoundException('User not found');
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.model.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    await this.model.updateOne(
      { _id: user._id },
      { 
        $set: { passwordHash },
        $unset: { 
          resetPasswordToken: "",
          resetPasswordExpires: ""
        } 
      }
    );
  }

  async addRefreshToken(userId: string, token: string, expiresIn: number): Promise<void> {
    const expires = new Date();
    expires.setSeconds(expires.getSeconds() + expiresIn);

    await this.model.findByIdAndUpdate(userId, {
      $push: {
        tokens: {
          token,
          expires,
          type: 'refresh',
          blacklisted: false,
        },
      },
    });
  }

  async removeRefreshToken(userId: string, token: string): Promise<void> {
    await this.model.findByIdAndUpdate(userId, {
      $pull: {
        tokens: { token, type: 'refresh' },
      },
    });
  }

  async verifyEmail(token: string): Promise<IUser> {
    try {
      const user = await this.model.findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: new Date() }
      });

      if (!user) {
        console.log('\n❌ Email verification failed: Invalid or expired token');
        throw new BadRequestException('Invalid or expired verification token');
      }

      console.log('\n🔍 Verifying email for user:', {
        userId: user._id,
        email: user.email,
        token: token.substring(0, 10) + '...' // Log first 10 chars of token for security
      });

      const updatedUser = await this.model.findByIdAndUpdate(
        user._id,
        {
          $set: { isEmailVerified: true },
          $unset: { 
            emailVerificationToken: "",
            emailVerificationExpires: ""
          }
        },
        { new: true, lean: true }
      );
      
      if (!updatedUser) {
        throw new InternalServerErrorException('Failed to update user after email verification');
      }
      
      console.log('✅ Email verified successfully for:', {
        userId: updatedUser._id,
        email: updatedUser.email,
        timestamp: new Date().toISOString()
      });
      
      return updatedUser as IUser;
      
    } catch (error) {
      console.error('❌ Error in verifyEmail:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to verify email');
    }
  }

  async resendVerificationEmail(email: string): Promise<{ status: number; message: string }> {
    try {
      console.log(`🔄 [resendVerificationEmail] Processing request for email: ${email}`);
      
      // Normalize email by trimming and converting to lowercase
      const normalizedEmail = email.toLowerCase().trim();
      
      // Find user by email (case-insensitive search)
      const user = await this.model.findOne({ 
        email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } 
      });

      if (!user) {
        console.log(`⚠️  [resendVerificationEmail] Email not found: ${normalizedEmail}`);
        // For security reasons, we don't reveal if an email exists in the system
        return { 
          status: 200,
          message: 'If your email is registered and not verified, you will receive a verification email' 
        };
      }

      // Check if email is already verified
      if (user.isEmailVerified) {
        console.log(`ℹ️  [resendVerificationEmail] Email already verified: ${normalizedEmail}`);
        return {
          status: 200,
          message: 'This email is already verified'
        };
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Update user with new verification token
      const updatedUser = await this.model.findByIdAndUpdate(
        user._id,
        {
          $set: {
            emailVerificationToken: verificationToken,
            emailVerificationExpires: verificationExpires
          }
        },
        { new: true, lean: true }
      );
      
      if (!updatedUser) {
        throw new InternalServerErrorException('Failed to update verification token');
      }

      // Get frontend URL from config
      const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3500');
      const verificationUrl = `${frontendUrl}/users/verify-email?token=${verificationToken}`;
      
      if (!user.email) {
        throw new Error('User email is not set');
      }
      
      // Send verification email
      await this.mailService.sendEmailVerification(user.email, verificationUrl);
      
      console.log(`✅ [resendVerificationEmail] Verification email sent to: ${user.email}`);
      
      return { 
        status: 200,
        message: 'Verification email sent successfully' 
      };
      
    } catch (error) {
      console.error(`❌ [resendVerificationEmail] Error for ${email}:`, error);
      // Don't expose internal errors to the client for security reasons
      throw new InternalServerErrorException('Failed to process verification email');
    }
  }

  async validateRefreshToken(userId: string, token: string): Promise<boolean> {
    const user = await this.model.findOne({
      _id: userId,
      'tokens.token': token,
      'tokens.type': 'refresh',
      'tokens.blacklisted': false,
      'tokens.expires': { $gt: new Date() },
    });

    return !!user;
  }
}

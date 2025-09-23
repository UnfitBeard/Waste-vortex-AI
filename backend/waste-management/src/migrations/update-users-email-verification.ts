import { getModelToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { User } from '../users/schemas/user.schema';

export async function updateUsersEmailVerification(connection: Connection) {
  console.log('Starting migration: Update users email verification fields');
  
  const userModel = connection.model(User.name);
  
  // Update all existing users to have isEmailVerified set to true
  // This is a one-time migration for existing users
  const result = await userModel.updateMany(
    { isEmailVerified: { $exists: false } },
    { 
      $set: { 
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      } 
    }
  );
  
  console.log(`Migration complete. Updated ${result.modifiedCount} users.`);
  return result;
}

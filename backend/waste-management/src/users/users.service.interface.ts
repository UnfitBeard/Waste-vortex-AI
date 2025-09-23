import { User } from './schemas/user.schema';

export interface IUsersService {
  create(data: Partial<User>): Promise<User>;
  update(id: string, updateData: Partial<User>): Promise<User>;
  findById(id: string): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findByEmailWithPassword(email: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
  updateProfile(userId: string, updateData: any): Promise<User>;
  changePassword(userId: string, changePasswordDto: any): Promise<void>;
  setPasswordResetToken(email: string, token: string, expires: Date): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  verifyEmail(token: string): Promise<User>;
  resendVerificationEmail(email: string): Promise<{ status: number; message: string }>;
  validateRefreshToken(userId: string, token: string): Promise<boolean>;
  addRefreshToken(userId: string, token: string, expiresIn: number): Promise<void>;
  removeRefreshToken(userId: string, token: string): Promise<void>;
  invalidateAllRefreshTokens(userId: string): Promise<void>;
}

import { IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'currentPassword123',
  })
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({
    description: 'New password (min 6 characters)',
    minLength: 6,
    example: 'newSecurePassword123',
  })
  @MinLength(6)
  @IsNotEmpty()
  newPassword: string;
}

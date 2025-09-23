/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class LoginDto {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'user@example.com',
  })
  @IsEmail() 
  email: string;

  @ApiProperty({
    description: 'Password (min 6 characters)',
    minLength: 6,
    example: 'password123',
  })
  @IsString() 
  @MinLength(6) 
  password: string;
}

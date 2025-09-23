/* eslint-disable @typescript-eslint/no-unsafe-call */
import { MinLength, IsEmail, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class RegisterDto {
  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
  })
  @IsString() 
  name: string;

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

  @ApiProperty({
    description: 'User role',
    enum: ['HOUSEHOLD', 'SME', 'DRIVER', 'RECYCLER', 'COUNCIL', 'ADMIN'],
    example: 'HOUSEHOLD',
  })
  @IsIn(['HOUSEHOLD', 'SME', 'DRIVER', 'RECYCLER', 'COUNCIL', 'ADMIN'])
  role: string;
}

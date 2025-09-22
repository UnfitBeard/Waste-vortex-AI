/* eslint-disable @typescript-eslint/no-unsafe-call */
import { MinLength, IsEmail, IsString, IsIn } from 'class-validator';
export class RegisterDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsIn(['HOUSEHOLD', 'SME', 'DRIVER', 'RECYCLER', 'COUNCIL', 'ADMIN'])
  role: string;
}

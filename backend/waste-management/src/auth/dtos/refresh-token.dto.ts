import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token to get a new access token',
    example: 'valid-refresh-token-here',
  })
  @IsNotEmpty()
  refreshToken: string;
}

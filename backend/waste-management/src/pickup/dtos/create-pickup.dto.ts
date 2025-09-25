/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/pickups/dtos/create-pickup.dto.ts
import { IsEnum, IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WasteType } from '../schema/pickup.schema';
import { Type, Transform } from 'class-transformer';

export class CreatePickupDto {
  @ApiProperty({ enum: WasteType })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsEnum(WasteType, {
    message:
      'wasteType must be one of: organic, plastic, metal, paper, glass, e_waste, other',
  })
  wasteType: WasteType;

  @ApiProperty({ example: 12.5, description: 'Estimated weight in kg' })
  @Type(() => Number) // <- convert "12.5" (string) -> 12.5 (number)
  @IsNumber(
    { allowInfinity: false, allowNaN: false },
    { message: 'estimatedWeightKg must be a number' },
  )
  @Min(0, { message: 'estimatedWeightKg must not be less than 0' })
  estimatedWeightKg: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, example: 'Block A, Room 7' })
  @IsOptional()
  @IsString()
  address?: string;

  /** NEW: optional device GPS */
  @ApiProperty({ required: false, example: -0.3971 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiProperty({ required: false, example: 36.9624 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;
}

import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class AssignDto {
  @IsOptional()
  @IsMongoId()
  driverId: string;
}

export class UnassignDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CancelDto {
  @IsString()
  reason: string;
}

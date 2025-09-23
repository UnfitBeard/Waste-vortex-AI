import { IsString, IsOptional } from 'class-validator';

// This DTO is for any additional data sent with the file upload,
// but for now, it can be a placeholder.
export class UploadDto {
  @IsOptional()
  @IsString()
  description?: string;
}

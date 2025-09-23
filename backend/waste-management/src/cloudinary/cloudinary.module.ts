import { Module } from '@nestjs/common';
import { CloudinaryProvider } from './cloudinary.service';

@Module({
  providers: [CloudinaryProvider],
  exports: [CloudinaryProvider],
})
export class CloudinaryModule {}

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Upload extends Document {
  @Prop({ required: true })
  publicId: string; // Cloudinary's unique ID for the image

  @Prop({ required: true })
  secureUrl: string; // The secure URL to access the image
}

export const UploadSchema = SchemaFactory.createForClass(Upload);

import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Upload } from './schemas/upload.schema';
import { CLOUDINARY } from '../cloudinary/constants';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class UploadsService {
  constructor(
    @InjectModel(Upload.name) private readonly uploadModel: Model<Upload>,
    @Inject(CLOUDINARY) private readonly cloudinaryInstance, // injected
  ) {}

  async uploadSingleImage(file: Express.Multer.File): Promise<Upload> {
    const uploadResult = await this.uploadToCloudinary(file);

    const newUpload = new this.uploadModel({
      publicId: uploadResult.public_id,
      secureUrl: uploadResult.secure_url,
    });

    return newUpload.save();
  }

  async uploadMultipleImages(files: Express.Multer.File[]): Promise<Upload[]> {
    const results = await Promise.all(
      files.map((file) => this.uploadToCloudinary(file)),
    );

    const uploadsToSave = results.map((result) => ({
      publicId: result.public_id,
      secureUrl: result.secure_url,
    }));

    return this.uploadModel.insertMany(uploadsToSave);
  }

  private async uploadToCloudinary(file: Express.Multer.File): Promise<any> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto' },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return reject(error);
          }
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}

/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Pickup, PickupDocument } from './schema/pickup.schema';
import { Model, Types } from 'mongoose';
import { UploadsService } from 'src/uploads/uploads.service';
import { ContaminationClient } from './contamination.client';
import { CreatePickupDto } from './dtos/create-pickup.dto';
import { Express } from 'express';

@Injectable()
export class PickupService {
  private readonly logger = new Logger(PickupService.name);

  constructor(
    @InjectModel(Pickup.name)
    private readonly pickupModel: Model<PickupDocument>,
    private readonly uploadsService: UploadsService,
    private readonly contaminationClient: ContaminationClient,
  ) {}

  async createPickup(
    dto: CreatePickupDto,
    image: Express.Multer.File,
    requestedBy: string,
  ) {
    if (!requestedBy) throw new BadRequestException('User not found');
    if (!image) throw new BadRequestException('Image file is required');

    const uploaded = await this.uploadsService.uploadSingleImage(image);

    // Get location from the pickup request
    const location = dto.address || 
      (dto.lat && dto.lng ? `Coordinates: ${dto.lat.toFixed(4)}, ${dto.lng.toFixed(4)}` : 'Location not specified');
    
    // Score contamination (URL First then buffer)
    let scoreRes: { score: number; label: string };
    try {
      scoreRes = await this.contaminationClient.scoreImageByUrl(
        uploaded.secureUrl,
        dto.wasteType,
        location
      );
      if (Number.isNaN(scoreRes.score))
        throw new Error('Invalid score from model');
    } catch (e) {
      this.logger.warn(`URL scoring failed, trying buffer: ${e.message}`);
      scoreRes = await this.contaminationClient.scoreByBuffer(
        image.buffer,
        image.originalname,
        dto.wasteType,
        location
      );
    }

    // Persist the pickup
    const doc = new this.pickupModel({
      wasteType: dto.wasteType,
      estimatedWeightKg: dto.estimatedWeightKg,
      description: dto.description ?? null,
      imagePublicId: uploaded.publicId,
      imageSecureUrl: uploaded.secureUrl,
      contaminationScore: Math.max(0, Math.min(1, scoreRes.score)), // clamp 0..1
      contaminationLabel: scoreRes.label,
      evaluatedAt: new Date(),
      status: 'pending',
      requestedBy: new Types.ObjectId(requestedBy),
      address: dto.address,
      geom:
        dto.lat != null && dto.lng != null
          ? { type: 'Point', coordinates: [dto.lat, dto.lat] }
          : undefined,
    });

    return doc.save();
  }

  async findAll() {
    return this.pickupModel.find().sort({ createdAt: -1 }).lean();
  }

  async findOne(id: string) {
    return this.pickupModel.findById(id).lean();
  }
}

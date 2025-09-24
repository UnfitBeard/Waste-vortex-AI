/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Pickup, PickupDocument } from './schema/pickup.schema';
import { Model } from 'mongoose';
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

  async createPickup(dto: CreatePickupDto, image: Express.Multer.File) {
    if (!image) throw new BadRequestException('Image file is required');

    const uploaded = await this.uploadsService.uploadSingleImage(image);

    // Score contamination (URL FIrst then buffer)
    let scoreRes: { score: number; label: string };
    try {
      scoreRes = await this.contaminationClient.scoreImageByUrl(
        uploaded.secureUrl,
      );
      if (Number.isNaN(scoreRes.score))
        throw new Error('Invalid score from model');
    } catch (e) {
      this.logger.warn(`URL scoring failed, trying buffer: ${e.message}`);
      scoreRes = await this.contaminationClient.scoreByBuffer(
        image.buffer,
        image.originalname,
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

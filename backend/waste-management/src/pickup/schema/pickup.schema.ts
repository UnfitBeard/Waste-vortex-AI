/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export enum WasteType {
  ORGANIC = 'organic',
  PLASTIC = 'plastic',
  METAL = 'metal',
  PAPER = 'paper',
  GLASS = 'glass',
  E_WASTE = 'e_waste',
  OTHER = 'other',
}

export type PickupDocument = HydratedDocument<Pickup>;
@Schema({ timestamps: true })
export class Pickup {
  @Prop({ enum: WasteType, required: true })
  wasteType: WasteType;

  @Prop({ required: true, min: 0 })
  estimatedWeightKg: number;

  @Prop({ required: true })
  imagePublicId: string;

  @Prop({ required: true })
  imageSecureUrl: string;

  @Prop({ required: true, min: 0, max: 1 })
  contaminationScore: number; // 0..1

  @Prop()
  contaminationLabel?: string; // e.g. "low" | "medium" | "high"

  @Prop({
    default: 'pending',
    enum: ['pending', 'scheduled', 'completed', 'cancelled'],
  })
  status: string;

  // Optional metadata
  @Prop()
  description?: string;

  @Prop({ type: Date })
  evaluatedAt?: Date;
}

export const PickupSchema = SchemaFactory.createForClass(Pickup);

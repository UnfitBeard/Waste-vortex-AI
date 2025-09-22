import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type Role =
  | 'HOUSEHOLD'
  | 'SME'
  | 'DRIVER'
  | 'RECYCLER'
  | 'COUNCIL'
  | 'ADMIN';
export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true }) name: string;

  @Prop({ unique: true, sparse: true, trim: true, lowercase: true })
  email?: string;

  @Prop({ select: false })
  passwordHash?: string;

  @Prop({
    required: true,
    enum: ['HOUSEHOLD', 'SME', 'DRIVER', 'RECYCLER', 'COUNCIL', 'ADMIN'],
    default: 'HOUSEHOLD',
    index: true,
  })
  role: Role;
}

export const UserSchema = SchemaFactory.createForClass(User);

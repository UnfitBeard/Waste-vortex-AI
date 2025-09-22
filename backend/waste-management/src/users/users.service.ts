import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Model } from 'mongoose';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly model: Model<UserDocument>,
  ) {}

  async create(data: Partial<User>) {
    return await this.model.create(data);
  }

  findById(id: string) {
    return this.model.findById(id).lean();
  }

  findByEmailWithPassword(email: string) {
    return this.model
      .findOne({ email: email?.toLowerCase().trim() })
      .select('+passwordHash');
  }

  existsByEmail(email: string) {
    return this.model.exists({ email: email?.toLowerCase().trim() });
  }
}

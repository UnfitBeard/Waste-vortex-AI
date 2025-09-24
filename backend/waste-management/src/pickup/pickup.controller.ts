import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiParam, ApiTags } from '@nestjs/swagger';
import { PickupService } from './pickup.service';
import { CreatePickupDto } from './dtos/create-pickup.dto';

@ApiTags('pickups')
@Controller('pickups')
export class PickupController {
  constructor(private readonly pickupsService: PickupService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary' },
        wasteType: {
          type: 'string',
          enum: [
            'organic',
            'plastic',
            'metal',
            'paper',
            'glass',
            'e_waste',
            'other',
          ],
        },
        estimatedWeightKg: { type: 'number', example: 12.5 },
        description: { type: 'string' },
      },
      required: ['image', 'wasteType', 'estimatedWeightKg'],
    },
  })
  async create(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1000 * 1000 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|gif)' }),
        ],
      }),
    )
    image: Express.Multer.File,
    @Body() dto: CreatePickupDto,
  ) {
    const pickup = await this.pickupsService.createPickup(dto, image);
    return {
      status: 'success',
      message: 'Pickup created',
      data: pickup,
    };
  }

  @Get()
  async list() {
    const pickups = await this.pickupsService.findAll();
    return { status: 'success', data: pickups };
  }

  @Get(':id')
  @ApiParam({ name: 'id' })
  async getOne(@Param('id') id: string) {
    const pickup = await this.pickupsService.findOne(id);
    return { status: 'success', data: pickup };
  }
}

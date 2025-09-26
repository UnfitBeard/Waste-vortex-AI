/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
  Req,
  Query,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
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
        address: { type: 'string' },
        lat: { type: 'number' },
        lng: { type: 'number' },
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
    @Req() req: any,
  ) {
    const requestedById = req?.user?.sub || req?.user?._id || req?.user?.id;
    const pickup = await this.pickupsService.createPickup(
      dto,
      image,
      '68d24a95fee477ec06fd02a9',
    );
    return {
      status: 'success',
      message: 'Pickup created',
      data: pickup,
    };
  }

  // Available queue
  @Get('available')
  @ApiQuery({ name: 'lng', required: false })
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'radiusMeters', required: false, example: 5000 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  async available(
    @Query('lng') lng?: string,
    @Query('lat') lat?: string,
    @Query('radiusMeters') r?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.pickupsService.listAvailable(
      lng != null ? Number(lng) : undefined,
      lat != null ? Number(lat) : undefined,
      r != null ? Number(r) : 5000,
      limit !== undefined ? Number(limit) : 50,
    );
    return { status: 'success', data };
  }

  // DRIVER claims
  @Patch(':id/claim')
  async claim(@Param('id') id: string, @Req() req: any) {
    const driverId = req?.user?.sub || req?.user?._id || req?.user?.id; // from JWT
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const data = await this.pickupsService.claim(id, driverId);
    return { status: 'success', message: 'Returned to queue', data };
  }

  // Get all listed Pickups
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

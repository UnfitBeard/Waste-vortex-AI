import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  Body,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { UploadDto } from './dtos/upload.dto';
import { ApiConsumes, ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', 5))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
        description: { type: 'string' },
      },
    },
  })
  async uploadFiles(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1000 * 1000 * 5 }), // 5MB limit
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|gif)' }),
        ],
      }),
    )
    files: Express.Multer.File[],
    @Body() uploadDto: UploadDto,
  ) {
    const results = await this.uploadsService.uploadMultipleImages(files);

    return {
      status: 'success',
      message: `Uploaded ${results.length} file(s) successfully`,
      description: uploadDto?.description || null,
      data: results,
    };
  }
}

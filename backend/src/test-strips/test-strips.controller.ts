import { Controller, Post, Get, Param, UseInterceptors, UploadedFile, HttpException, HttpStatus, Query, DefaultValuePipe, ParseIntPipe, ParseUUIDPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { UseGuards } from '@nestjs/common';
import { TestStripsService } from './test-strips.service';
import * as path from 'path';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@Controller('test-strips')
@UseGuards(ThrottlerGuard)
export class TestStripsController {
  constructor(private readonly service: TestStripsService) { }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadsDir = path.resolve(__dirname, '../../..', 'uploads', 'raw');
          fs.mkdirSync(uploadsDir, { recursive: true });
          cb(null, uploadsDir);
        },
        filename: (req, file, cb) => {
          const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const extension = extname(file.originalname || '') || '.jpg';
          cb(null, `${unique}${extension}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/jpg'];
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new HttpException(`Only JPG/JPEG files are allowed. Received: ${file.mimetype}`, HttpStatus.BAD_REQUEST), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('No image file provided', HttpStatus.BAD_REQUEST);
    }
    // Basic content sniffing: ensure JPEG magic bytes (FF D8 FF)
    try {
      const fd = await fs.promises.open(file.path, 'r');
      const header = Buffer.alloc(3);
      await fd.read(header, 0, 3, 0);
      await fd.close();
      const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
      if (!isJpeg) {
        // remove invalid file
        await fs.promises.unlink(file.path).catch(() => { });
        throw new HttpException('Uploaded file is not a valid JPEG image', HttpStatus.BAD_REQUEST);
      }
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // treat read errors as invalid upload
      await fs.promises.unlink(file.path).catch(() => { });
      throw new HttpException('Failed to validate uploaded image', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.service.processUpload(file.path, file.filename, file.size, file.mimetype);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('qr code already exists')) {
        // duplicate QR code
        throw new HttpException(msg, HttpStatus.CONFLICT);
      }
      if (msg.toLowerCase().includes('invalid image') || msg.toLowerCase().includes('dimensions')) {
        // validation error from service
        throw new HttpException(msg, HttpStatus.BAD_REQUEST);
      }
      // unexpected error
      console.error('Upload processing error', err);
      throw new HttpException('Failed to process upload', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('list')
  async getList(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.service.getSubmissions(page, limit);
  }

  @Get(':id')
  async getById(@Param('id', new ParseUUIDPipe()) id: string) {
    const submission = await this.service.getSubmissionById(id);
    if (!submission) {
      throw new HttpException('Submission not found', HttpStatus.NOT_FOUND);
    }
    return submission;
  }
}
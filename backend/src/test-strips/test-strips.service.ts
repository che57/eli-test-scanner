import { Injectable } from '@nestjs/common';
import Jimp from 'jimp';
import jsQR from 'jsqr';
import * as path from 'path';
import * as fs from 'fs';
import { TestStripsRepository } from '../repositories/testStripsRepository';

export interface UploadResponse {
  id: string;
  status: string;
  qrCode: string | null;
  qrCodeValid: boolean;
  processedAt: string;
  isExpired: boolean;
  expirationYear: number | null;
  imageMetadata: {
    size: number;
    dimensions: string;
    mimeType: string;
    extension: string;
  };
}

export interface Submission {
  id: string;
  qrCode: string | null;
  status: string;
  thumbnailUrl: string;
  createdAt: string;
  isExpired: boolean;
  expirationYear: number | null;
}

export interface DetailedSubmission extends Submission {
  originalImagePath: string;
  imageSize: number;
  imageDimensions: string;
  errorMessage: string | null;
}

@Injectable()
export class TestStripsService {
  private repository: TestStripsRepository;
  private thumbnailsDir: string;

  constructor(private repositoryInjected: TestStripsRepository) {
    this.repository = repositoryInjected;
    // Save thumbnails in a configurable directory (env override) or workspace-level `uploads/thumbnails`
    this.thumbnailsDir = process.env.THUMBNAILS_DIR
      ? path.resolve(process.env.THUMBNAILS_DIR)
      : path.resolve(__dirname, '../../..', 'uploads', 'thumbnails');
    // Ensure directory exists (async, non-blocking). Log on failure.
    fs.promises.mkdir(this.thumbnailsDir, { recursive: true }).catch((err) => {
      console.error('Failed to create thumbnails directory', this.thumbnailsDir, err);
    });
  }
  async extractQRCode(imagePath: string): Promise<{ code: string | null; normalized: string | null; valid: boolean; expirationYear: number | null; isExpired: boolean; error?: string }> {
    try {
      const image = await Jimp.read(imagePath);
      // Downscale a copy for detection to reduce memory usage on large images
      const detectImage = image.clone();
      const maxDim = 1024;
      if (detectImage.bitmap.width > maxDim || detectImage.bitmap.height > maxDim) {
        detectImage.resize(maxDim, Jimp.AUTO);
      }
      const imageData = new Uint8ClampedArray(detectImage.bitmap.data);
      const code = jsQR(imageData, detectImage.bitmap.width, detectImage.bitmap.height);
      if (!code || !code.data) return { code: null, normalized: null, valid: false, expirationYear: null, isExpired: false };

      const raw = String(code.data).trim();
      const normalized = raw.toUpperCase();
      const pattern = /^ELI-\d{4}-[A-Z0-9]{3}$/;
      const valid = pattern.test(normalized);

      // Extract year and check expiration
      let expirationYear: number | null = null;
      let isExpired = false;
      if (valid) {
        const yearMatch = normalized.match(/^ELI-(\d{4})/);
        if (yearMatch) {
          expirationYear = parseInt(yearMatch[1], 10);
          const currentYear = new Date().getFullYear();
          isExpired = expirationYear < currentYear;
        }
      }

      return { code: raw, normalized, valid, expirationYear, isExpired };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('extractQRCode error for', imagePath, err);
      return { code: null, normalized: null, valid: false, expirationYear: null, isExpired: false, error: message };
    }
  }

  async processUpload(originalPath: string, filename: string, size: number, mimeType?: string): Promise<UploadResponse> {
    // Validate image can be read and get dimensions
    let image: Jimp;
    let imageDimensions = '';
    try {
      image = await Jimp.read(originalPath);
      imageDimensions = `${image.bitmap.width}x${image.bitmap.height}`;

      // Validate minimum dimensions (e.g., at least 100x100)
      if (image.bitmap.width < 100 || image.bitmap.height < 100) {
        throw new Error('Image dimensions too small (minimum 100x100 pixels)');
      }

      // Validate maximum dimensions (e.g., max 10000x10000)
      if (image.bitmap.width > 10000 || image.bitmap.height > 10000) {
        throw new Error('Image dimensions too large (maximum 10000x10000 pixels)');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Image validation failed for', originalPath, err);
      throw new Error(`Invalid image file: ${message}`);
    }

    // Sanitize filename and generate unique thumbnail filename to avoid traversal/collisions
    const safeBase = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    const thumbFilename = `thumb-${Date.now()}-${Math.floor(Math.random() * 10000)}-${safeBase}`;
    const thumbnailPath = path.join(this.thumbnailsDir, thumbFilename);
    const fileExtension = path.extname(filename).toLowerCase();

    // Generate thumbnail (ensure directory exists)
    await fs.promises.mkdir(this.thumbnailsDir, { recursive: true }).catch((err) => {
      console.error('Failed to ensure thumbnails dir before write', this.thumbnailsDir, err);
    });

    try {
      image.resize(200, 200).quality(80);
      await image.writeAsync(thumbnailPath);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to generate thumbnail for', originalPath, err);
      // continue — thumbnail failure shouldn't block processing of QR
    }

    // Extract QR
    const qrResult = await this.extractQRCode(originalPath);
    const qrCodeRaw = qrResult.code;
    const qrCodeNormalized = qrResult.normalized;
    const qrCodeValid = qrResult.valid;

    // Store normalized code when valid for consistent downstream use
    const qrToStore = qrCodeValid && qrCodeNormalized ? qrCodeNormalized : qrCodeRaw;

    // Check for duplicate QR code
    if (qrToStore) {
      const existing = await this.repository.findByQrCode(qrToStore);
      if (existing) {
        throw new Error(`QR code already exists (ID: ${existing.id})`);
      }
    }

    // Save to DB (mark clear error messages)
    const submission = await this.repository.create({
      qrCode: qrToStore,
      originalImagePath: originalPath, // TODO: Replace with S3 URL
      thumbnailPath, // TODO: Replace with S3 URL
      imageSize: size,
      imageDimensions,
      status: 'processed',
      errorMessage: qrCodeValid ? null : (qrCodeRaw ? 'Invalid QR code format' : (qrResult.error || 'QR code not found')),
    });

    return {
      id: submission.id,
      status: submission.status,
      qrCode: submission.qrCode,
      qrCodeValid,
      processedAt: submission.createdAt.toISOString(),
      isExpired: qrResult.isExpired,
      expirationYear: qrResult.expirationYear,
      imageMetadata: {
        size,
        dimensions: imageDimensions,
        mimeType: mimeType || 'image/jpg',
        extension: fileExtension,
      },
    };
  }

  private checkExpiration(qrCode: string | null): { isExpired: boolean; expirationYear: number | null } {
    if (!qrCode) return { isExpired: false, expirationYear: null };
    const yearMatch = qrCode.match(/^ELI-(\d{4})/);
    if (!yearMatch) return { isExpired: false, expirationYear: null };
    const expirationYear = parseInt(yearMatch[1], 10);
    const currentYear = new Date().getFullYear();
    return { isExpired: expirationYear < currentYear, expirationYear };
  }

  async getSubmissions(page: number, limit: number): Promise<{ submissions: Submission[]; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const results = await this.repository.findMany({ skip, take: limit });
    const submissions = results.map((row) => {
      const expiration = this.checkExpiration(row.qrCode);
      return {
        id: row.id,
        qrCode: row.qrCode,
        status: row.status,
        thumbnailUrl: `/uploads/thumbnails/${path.basename(row.thumbnailPath || '')}`,
        createdAt: row.createdAt.toISOString(),
        isExpired: expiration.isExpired,
        expirationYear: expiration.expirationYear,
      };
    });
    return { submissions, page, limit };
  }

  async getSubmissionById(id: string): Promise<DetailedSubmission | null> {
    const submission = await this.repository.findById(id);
    if (!submission) return null;

    const expiration = this.checkExpiration(submission.qrCode);
    return {
      id: submission.id,
      qrCode: submission.qrCode,
      status: submission.status,
      thumbnailUrl: `/uploads/thumbnails/${path.basename(submission.thumbnailPath || '')}`,
      createdAt: submission.createdAt.toISOString(),
      originalImagePath: submission.originalImagePath,
      imageSize: submission.imageSize || 0,
      imageDimensions: submission.imageDimensions || '',
      errorMessage: submission.errorMessage,
      isExpired: expiration.isExpired,
      expirationYear: expiration.expirationYear,
    };
  }
}
import Jimp from 'jimp';
import jsQR from 'jsqr';
import * as fs from 'fs';

import { TestStripsService } from './test-strips.service';
import { TestStripsRepository } from '../repositories/testStripsRepository';
import { TestStripSubmission } from '../entities/test-strip-submission.entity';

jest.mock('jimp');
jest.mock('jsqr');

const mockedJimp = Jimp as unknown as { read: jest.Mock };
const mockedJsQR = jsQR as unknown as jest.Mock;

describe('TestStripsService', () => {
  let service: TestStripsService;
  let repoMock: Partial<TestStripsRepository>;

  beforeEach(() => {
    // prevent mkdir from touching disk during tests
    jest.spyOn(fs.promises, 'mkdir' as any).mockResolvedValue(undefined as any);

    repoMock = {
      create: jest.fn(async (data) => {
        const entity: TestStripSubmission = {
          id: '1',
          createdAt: new Date(),
          qrCode: data.qrCode ?? null,
          originalImagePath: data.originalImagePath,
          thumbnailPath: data.thumbnailPath ?? null,
          imageSize: data.imageSize ?? null,
          imageDimensions: data.imageDimensions ?? null,
          status: data.status,
          errorMessage: data.errorMessage ?? null,
        };
        return entity;
      }),
      findMany: jest.fn(async () => []),
      findById: jest.fn(async () => null),
      findByQrCode: jest.fn(async () => null),
    };

    service = new TestStripsService(repoMock as TestStripsRepository);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('extractQRCode returns normalized and valid=true for ELI formatted code', async () => {
    const fakeImage = {
      bitmap: { data: new Uint8ClampedArray([1, 2, 3, 4]), width: 200, height: 200 },
      clone() { return this; },
      resize() { return this; },
    };

    mockedJimp.read.mockResolvedValue(fakeImage);
    mockedJsQR.mockReturnValue({ data: 'ELI-2025-ABC' });

    const res = await service.extractQRCode('/some/path.jpg');

    expect(res.code).toBe('ELI-2025-ABC');
    expect(res.normalized).toBe('ELI-2025-ABC');
    expect(res.valid).toBe(true);
  });

  test('extractQRCode returns valid=false for non-matching code', async () => {
    const fakeImage = {
      bitmap: { data: new Uint8ClampedArray([1, 2, 3, 4]), width: 200, height: 200 },
      clone() { return this; },
      resize() { return this; },
    };
    mockedJimp.read.mockResolvedValue(fakeImage);
    mockedJsQR.mockReturnValue({ data: 'not-a-match' });

    const res = await service.extractQRCode('/some/path.jpg');

    expect(res.code).toBe('not-a-match');
    expect(res.normalized).toBe('NOT-A-MATCH');
    expect(res.valid).toBe(false);
  });

  test('processUpload stores normalized QR when valid and calls repository', async () => {
    // Mock thumbnail generation image
    const thumbImage = {
      bitmap: { data: new Uint8ClampedArray([1, 2, 3, 4]), width: 400, height: 300 },
      clone() { return this; },
      resize() { return this; },
      quality() { return this; },
      writeAsync: jest.fn().mockResolvedValue(undefined),
    };

    // Jimp.read will be called twice: one for thumbnail, one for detection clone; return object with needed methods
    mockedJimp.read.mockResolvedValue(thumbImage);

    // Spy extractQRCode on the service to return a valid normalized result
    jest.spyOn(service, 'extractQRCode').mockResolvedValue({ code: 'ELI-2024-XYZ', normalized: 'ELI-2024-XYZ', valid: true, expirationYear: 2024, isExpired: true });

    const createSpy = repoMock.create as jest.Mock;

    const resp = await service.processUpload('/orig/path.jpg', 'input.jpg', 12345);

    expect(resp.qrCodeValid).toBe(true);
    expect(resp.qrCode).toBe('ELI-2024-XYZ');
    expect(createSpy).toHaveBeenCalled();
    const createdArg = createSpy.mock.calls[0][0];
    expect(createdArg.qrCode).toBe('ELI-2024-XYZ');
    expect(typeof createdArg.thumbnailPath).toBe('string');
  });

  test('extractQRCode detects expired QR code (year < current year)', async () => {
    const fakeImage = {
      bitmap: { data: new Uint8ClampedArray([1, 2, 3, 4]), width: 200, height: 200 },
      clone() { return this; },
      resize() { return this; },
    };
    mockedJimp.read.mockResolvedValue(fakeImage);
    mockedJsQR.mockReturnValue({ data: 'ELI-2020-ABC' });

    const res = await service.extractQRCode('/some/path.jpg');

    expect(res.valid).toBe(true);
    expect(res.expirationYear).toBe(2020);
    expect(res.isExpired).toBe(true);
  });

  test('extractQRCode detects non-expired QR code (year >= current year)', async () => {
    const currentYear = new Date().getFullYear();
    const futureYear = currentYear + 1;
    const fakeImage = {
      bitmap: { data: new Uint8ClampedArray([1, 2, 3, 4]), width: 200, height: 200 },
      clone() { return this; },
      resize() { return this; },
    };
    mockedJimp.read.mockResolvedValue(fakeImage);
    mockedJsQR.mockReturnValue({ data: `ELI-${futureYear}-XYZ` });

    const res = await service.extractQRCode('/some/path.jpg');

    expect(res.valid).toBe(true);
    expect(res.expirationYear).toBe(futureYear);
    expect(res.isExpired).toBe(false);
  });

  test('getSubmissions returns submissions with expiration info', async () => {
    const currentYear = new Date().getFullYear();
    const mockSubmissions = [
      {
        id: '1',
        qrCode: `ELI-${currentYear}-ABC`,
        status: 'success',
        createdAt: new Date(),
        originalImagePath: '/path/1.jpg',
        thumbnailPath: '/path/thumb1.jpg',
        imageSize: 1024,
        imageDimensions: { width: 800, height: 600 },
        errorMessage: null,
      },
    ];

    (repoMock.findMany as jest.Mock).mockResolvedValue(mockSubmissions);

    const result = await service.getSubmissions(1, 10);

    expect(result).toBeDefined();
  });

  test('getSubmissionById returns submission with expiration calculated', async () => {
    const mockSubmission = {
      id: 'test-id',
      qrCode: 'ELI-2020-XYZ',
      status: 'success',
      createdAt: new Date(),
      originalImagePath: '/path/test.jpg',
      thumbnailPath: '/path/thumb.jpg',
      imageSize: 2048,
      imageDimensions: { width: 1920, height: 1440 },
      errorMessage: null,
    };

    (repoMock.findById as jest.Mock).mockResolvedValue(mockSubmission);

    const result = await service.getSubmissionById('test-id');

    expect(result).toBeDefined();
    expect(result?.qrCode).toBe('ELI-2020-XYZ');
    expect(repoMock.findById).toHaveBeenCalledWith('test-id');
  });

  test('getSubmissionById returns null for nonexistent submission', async () => {
    (repoMock.findById as jest.Mock).mockResolvedValue(null);

    const result = await service.getSubmissionById('nonexistent-id');

    expect(result).toBeNull();
  });

  test('checkExpiration correctly validates past year QR codes', () => {
    const result = service['checkExpiration']('ELI-2020-ABC');
    expect(result.isExpired).toBe(true);
    expect(result.expirationYear).toBe(2020);
  });

  test('checkExpiration correctly validates current year QR codes', () => {
    const currentYear = new Date().getFullYear();
    const result = service['checkExpiration'](`ELI-${currentYear}-XYZ`);
    expect(result.isExpired).toBe(false);
    expect(result.expirationYear).toBe(currentYear);
  });

  test('checkExpiration handles null QR code', () => {
    const result = service['checkExpiration'](null);
    expect(result.isExpired).toBe(false);
    expect(result.expirationYear).toBeNull();
  });

  test('processUpload handles missing QR code gracefully', async () => {
    jest.spyOn(fs.promises, 'mkdir' as any).mockResolvedValue(undefined as any);

    const mockJimpImage = {
      bitmap: { data: new Uint8ClampedArray([1, 2, 3, 4]), width: 200, height: 200 },
      clone() { return this; },
      resize() { return this; },
      quality() { return this; },
      writeAsync: jest.fn().mockResolvedValue(undefined),
    };

    mockedJimp.read.mockResolvedValue(mockJimpImage);
    mockedJsQR.mockReturnValue(null); // No QR code
    (repoMock.findByQrCode as jest.Mock).mockResolvedValue(null);

    const result = await service.processUpload('/path/test.jpg', 'test.jpg', 1024);

    expect(result.qrCodeValid).toBe(false);
    expect(result.qrCode).toBeNull();
  });
});

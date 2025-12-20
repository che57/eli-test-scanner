import { HttpException, HttpStatus } from '@nestjs/common';
import { TestStripsController } from './test-strips.controller';
import { TestStripsService } from './test-strips.service';

describe('TestStripsController', () => {
  let controller: TestStripsController;
  let mockService: jest.Mocked<TestStripsService>;

  beforeEach(() => {
    mockService = {
      processUpload: jest.fn(),
      getSubmissions: jest.fn(),
      getSubmissionById: jest.fn(),
    } as jest.Mocked<TestStripsService>;

    controller = new TestStripsController(mockService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upload', () => {
    it('should throw HttpException if no file provided', async () => {
      await expect(controller.upload(null as unknown as Express.Multer.File)).rejects.toThrow(
        new HttpException('No image file provided', HttpStatus.BAD_REQUEST),
      );
    });

    it('should call service.processUpload with file path and metadata', async () => {
      const mockFile = {
        path: '/uploads/test.jpg',
        filename: 'test.jpg',
        size: 1024,
      } as Express.Multer.File;

      const mockResponse = {
        id: '123',
        status: 'success' as const,
        qrCode: 'ELI-2024-ABC',
        qrCodeValid: true,
      };

      mockService.processUpload.mockResolvedValue(mockResponse);

      const result = await controller.upload(mockFile);

      expect(mockService.processUpload).toHaveBeenCalledWith(
        '/uploads/test.jpg',
        'test.jpg',
        1024,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should return upload response with QR code info', async () => {
      const mockFile = {
        path: '/uploads/test.jpg',
        filename: 'test.jpg',
        size: 2048,
      } as Express.Multer.File;

      const mockResponse = {
        id: 'uuid-123',
        status: 'success' as const,
        qrCode: 'ELI-2025-XYZ',
        qrCodeValid: true,
        isExpired: false,
        expirationYear: 2025,
        processedAt: '2024-12-19T00:00:00Z',
      };

      mockService.processUpload.mockResolvedValue(mockResponse);

      const result = await controller.upload(mockFile);

      expect(result.qrCode).toBe('ELI-2025-XYZ');
      expect(result.qrCodeValid).toBe(true);
      expect(result.isExpired).toBe(false);
    });
  });

  describe('getList', () => {
    it('should call service.getSubmissions with default pagination', async () => {
      const mockSubmissions = {
        submissions: [
          { id: '1', qrCode: 'ELI-2024-ABC', status: 'success' as const, createdAt: '2024-12-19T00:00:00Z' },
        ],
        page: 1,
        limit: 10,
      };

      mockService.getSubmissions.mockResolvedValue(mockSubmissions);

      await controller.getList(1, 10);

      expect(mockService.getSubmissions).toHaveBeenCalledWith(1, 10);
    });

    it('should return paginated submissions', async () => {
      const mockSubmissions = {
        submissions: [
          {
            id: '1',
            qrCode: 'ELI-2024-ABC',
            status: 'success' as const,
            createdAt: '2024-12-19T00:00:00Z',
            thumbnailUrl: '/uploads/thumbnails/1.jpg',
          },
          {
            id: '2',
            qrCode: undefined,
            status: 'error' as const,
            createdAt: '2024-12-18T00:00:00Z',
            errorMessage: 'No QR code detected',
          },
        ],
        page: 1,
        limit: 10,
      };

      mockService.getSubmissions.mockResolvedValue(mockSubmissions);

      const result = await controller.getList(1, 10);

      expect(result).toBeDefined();
      expect(result.submissions).toBeDefined();
      expect(result.submissions[0].qrCode).toBe('ELI-2024-ABC');
    });

    it('should accept custom page and limit', async () => {
      mockService.getSubmissions.mockResolvedValue({
        submissions: [],
        page: 5,
        limit: 25,
      });

      await controller.getList(5, 25);

      expect(mockService.getSubmissions).toHaveBeenCalledWith(5, 25);
    });
  });

  describe('getById', () => {
    it('should throw HttpException if submission not found', async () => {
      const id = 'nonexistent-id';
      mockService.getSubmissionById.mockResolvedValue(null);

      await expect(controller.getById(id)).rejects.toThrow(
        new HttpException('Submission not found', HttpStatus.NOT_FOUND),
      );
    });

    it('should call service.getSubmissionById with provided id', async () => {
      const id = 'valid-uuid';
      const mockSubmission = {
        id,
        qrCode: 'ELI-2024-ABC',
        status: 'success' as const,
        createdAt: '2024-12-19T00:00:00Z',
      };

      mockService.getSubmissionById.mockResolvedValue(mockSubmission);

      await controller.getById(id);

      expect(mockService.getSubmissionById).toHaveBeenCalledWith(id);
    });

    it('should return submission details', async () => {
      const mockSubmission = {
        id: '123',
        qrCode: 'ELI-2024-ABC',
        status: 'success' as const,
        createdAt: '2024-12-19T00:00:00Z',
        thumbnailUrl: '/uploads/thumbnails/123.jpg',
        isExpired: false,
        expirationYear: 2025,
      };

      mockService.getSubmissionById.mockResolvedValue(mockSubmission);

      const result = await controller.getById('123');

      expect(result).toEqual(mockSubmission);
      expect(result.qrCode).toBe('ELI-2024-ABC');
      expect(result.isExpired).toBe(false);
    });
  });
});

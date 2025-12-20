import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TestStripSubmission } from '../entities/test-strip-submission.entity';

@Injectable()
export class TestStripsRepository {
  constructor(
    @InjectRepository(TestStripSubmission)
    private readonly repository: Repository<TestStripSubmission>,
  ) { }

  async create(data: {
    qrCode?: string | null;
    originalImagePath: string;
    thumbnailPath?: string | null;
    imageSize?: number | null;
    imageDimensions?: string | null;
    status: string;
    errorMessage?: string | null;
  }): Promise<TestStripSubmission> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async findMany(options: { skip?: number; take?: number; order?: Record<string, 'ASC' | 'DESC'> } = {}): Promise<TestStripSubmission[]> {
    const skip = options.skip || 0;
    const take = options.take || 10;
    // Select only the fields needed for list responses to reduce payload
    return this.repository
      .createQueryBuilder('s')
      .select([
        's.id',
        's.qrCode',
        's.thumbnailPath',
        's.createdAt',
        's.status',
        's.imageSize',
        's.imageDimensions',
      ])
      .orderBy('s.createdAt', 'DESC')
      .skip(skip)
      .take(take)
      .getMany();
  }

  async findById(id: string): Promise<TestStripSubmission | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByQrCode(qrCode: string): Promise<TestStripSubmission | null> {
    return this.repository.findOne({ where: { qrCode } });
  }

  async count(): Promise<number> {
    return this.repository.count();
  }
}
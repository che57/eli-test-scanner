import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestStripsController } from './test-strips.controller';
import { TestStripsService } from './test-strips.service';
import { TestStripsRepository } from '../repositories/testStripsRepository';
import { TestStripSubmission } from '../entities/test-strip-submission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TestStripSubmission])],
  controllers: [TestStripsController],
  providers: [TestStripsService, TestStripsRepository],
})
export class TestStripsModule {}
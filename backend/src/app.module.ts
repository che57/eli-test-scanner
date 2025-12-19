import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestStripSubmission } from './entities/test-strip-submission.entity';
import { TestStripsModule } from './test-strips/test-strips.module';

import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]), // Global rate limiting
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'eli_user',
      password: process.env.DB_PASSWORD || 'eli_password',
      database: process.env.DB_DATABASE || 'eli_test_strips',
      entities: [TestStripSubmission],
      synchronize: true, // For development; use migrations in production
    }),
    TestStripsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
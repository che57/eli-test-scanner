import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS for mobile app
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Serve uploads from workspace-level `uploads` directory so thumbnails saved there are accessible
  app.useStaticAssets(path.resolve(__dirname, '../../uploads'), { prefix: '/uploads' });
  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`Server running on port ${port} (listening on 0.0.0.0)`);
}
bootstrap();
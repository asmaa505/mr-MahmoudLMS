import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 5000);
  const apiPrefix = configService.get<string>('apiPrefix', 'api/v1');
  const allowedOrigins = configService.get<string[]>('allowedOrigins', ['http://localhost:3000']);

  // 1. Set Global Route Prefix (e.g. /api/v1)
  app.setGlobalPrefix(apiPrefix);

  // 2. Global Security Headers via Helmet
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows media streaming & canvas access
      crossOriginEmbedderPolicy: false,
    }),
  );

  // 3. HTTP Response Compression
  app.use(compression());

  // 4. Cross-Origin Resource Sharing (CORS)
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, postman) or matching whitelist
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not permitted by CORS policy`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-device-fingerprint',
      'Range',
      'X-Requested-With',
    ],
    exposedHeaders: [
      'Content-Range',
      'Accept-Ranges',
      'Content-Length',
      'Content-Type',
    ],
  });

  // 5. Global Strict DTO Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  // 6. Global Response Transformer Envelope
  app.useGlobalInterceptors(new TransformInterceptor());

  // 7. Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // 8. Graceful Shutdown Hooks
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`================================================================`);
  logger.log(` Physics LMS Backend Server is running successfully!`);
  logger.log(` Platform: Prof. Mahmoud El-Shahat Physics Platform`);
  logger.log(` Port: ${port}`);
  logger.log(` API Endpoint: http://localhost:${port}/${apiPrefix}`);
  logger.log(`================================================================`);
}

bootstrap();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { json, urlencoded } from 'express';

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  const normalizedOrigin = normalizeOrigin(origin);

  return allowedOrigins.some((allowedOrigin) => {
    const normalizedAllowed = normalizeOrigin(allowedOrigin);

    if (normalizedAllowed.startsWith('*.')) {
      // Supports entries like *.vercel.app for preview deployments.
      const suffix = normalizedAllowed.slice(1); // .vercel.app
      return normalizedOrigin.endsWith(suffix);
    }

    return normalizedAllowed === normalizedOrigin;
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const configuredOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000'];
  const isDev = process.env.NODE_ENV !== 'production';

  // Security
  app.use(helmet());
  // Allow larger request bodies for profile image updates sent as data URLs.
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests without Origin header (server-to-server, curl, mobile apps).
      if (!origin) return callback(null, true);

      const allowedList = configuredOrigins.length ? configuredOrigins : defaultOrigins;
      const allowed = isOriginAllowed(origin, allowedList);
      const isLocalDevOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

      if (allowed || (isDev && isLocalDevOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger
const config = new DocumentBuilder()
  .setTitle('GlowBook API')
  .setDescription('Salon & Spa Booking Platform API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

  const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  console.log(`GlowBook API running on port ${port}`);
console.log(`Swagger docs available at /api/docs`);
}

bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const frontendUrl = process.env.FRONTEND_URL;
  const isProduction = process.env.NODE_ENV === 'production';

  // Enhanced CORS configuration for production
  app.enableCors({
    origin: isProduction 
      ? (frontendUrl ? [frontendUrl] : false)
      : true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  });

  // Security headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));

  const config = new DocumentBuilder()
    .setTitle('Perago Information Systems API')
    .setDescription(
      'Approval-driven REST API for managing an organization position hierarchy.',
    )
    .setVersion('1.0')
    .addTag('positions')
    .addTag('requests')
    .addTag('health')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(Number(process.env.PORT ?? 3000));
}

bootstrap();

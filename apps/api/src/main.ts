import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
import { OpenAPIGenerator } from '@orpc/openapi';
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4';
import { contract } from '@repo/contracts';
import swaggerUi from 'swagger-ui-express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5174',
    credentials: true,
  });
  const openAPIGenerator = new OpenAPIGenerator({
    schemaConverters: [new ZodToJsonSchemaConverter()],
  });
  const specFromContract = await openAPIGenerator.generate(contract, {
    info: {
      title: 'Job board API',
      version: '1.0.0',
    },
  });
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(specFromContract));
  app.use(helmet());
  app.use(cookieParser(process.env.COOKIE_SECRET));
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.useLogger(app.get(Logger));
  await app.listen(process.env.PORT ?? 3002);
}
bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5174',
    credentials: true,
  });

  app.use(helmet());
  app.use(cookieParser(process.env.COOKIE_SECRET));
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.useLogger(app.get(Logger));
  await app.listen(process.env.PORT ?? 3002);
}
bootstrap();

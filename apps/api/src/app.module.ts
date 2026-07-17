import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { SecurityModule } from './modules/security/security.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { ActivityModule } from './modules/activity/activity.module';
import * as Joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import { minutes, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CompaniesModule } from './modules/companies/companies.module';
import { MembersModule } from './modules/members/members.module';
import { MailModule } from './modules/mail/mail.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: minutes(120),
          limit: 100,
        },
        {
          name: 'loginByEmail',
          ttl: minutes(15),
          limit: 5,
        },
      ],
      errorMessage: 'Too many requests, please try again later.',
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        ENCRYPTION_KEY: Joi.string().length(64).required(),
        PORT: Joi.number().default(3002),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        SMTP_HOST: Joi.string().required(),
        SMTP_PORT: Joi.number().default(1025),
        SMTP_SECURE: Joi.boolean().default(false),
        SMTP_USER: Joi.string().optional(),
        SMTP_PASSWORD: Joi.string().optional(),
        SMTP_FROM: Joi.string().required(),
        FRONTEND_URL: Joi.string().default('http://localhost:5174'),
      }),
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
          ],
          censor: '[REDACTED]',
        },
        serializers: {
          req(req) {
            return {
              id: req.id,
              method: req.method,
              url: req.url,
              remoteAddress: req.remoteAddress,
            };
          },
          res(res) {
            return {
              statusCode: res.statusCode,
            };
          },
        },
      },
    }),
    AuthModule,
    PrismaModule,
    SecurityModule,
    SessionsModule,
    ActivityModule,
    CompaniesModule,
    MembersModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

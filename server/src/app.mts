import 'reflect-metadata';
import { isIP } from 'node:net';
import { Controller, Get, Inject, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { AuthModule } from './auth/auth.module.mjs';
import { providersToken } from './auth/auth.controller.mjs';
import type { AuthStore } from './auth/auth.store.mjs';
import type { Providers } from './auth/providers.mjs';

export function parseWebOrigin(value: string | undefined): URL | undefined {
  if (!value) return;
  const url = URL.parse(value);
  const host = url?.hostname ?? '';
  const loopback = host === 'localhost' || host === '[::1]' || (isIP(host) === 4 && host.startsWith('127.'));
  if (!url || value !== url.origin || (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))) {
    throw new Error('AUTH_WEB_ORIGIN must be a canonical HTTPS or loopback HTTP origin');
  }
  return url;
}

@Controller()
class HealthController {
  constructor(@Inject(providersToken) private readonly providers: Providers) {}

  @Get('healthz')
  health() {
    const authentication = Object.keys(this.providers).length ? 'configured' : 'unconfigured';
    return { status: 'ready', authentication };
  }
}

export async function createAuthApp(
  store: AuthStore, providers: Providers, webOrigin?: URL,
): Promise<NestExpressApplication> {
  @Module({
    imports: [AuthModule.register(store, providers, webOrigin)],
    controllers: [HealthController],
  })
  class AppModule {}

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false, logger: false });
  app.use((_request: Request, response: Response, next: () => void) => {
    response.set({
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    });
    next();
  });
  app.useBodyParser('json', { limit: '16kb' });
  app.useBodyParser('urlencoded', { limit: '16kb', extended: false });
  return app;
}

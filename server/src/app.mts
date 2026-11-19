import 'reflect-metadata';
import {
  BadRequestException, Body, Controller, Get, HttpCode, Inject, Injectable, Module,
  Param, Post, Query, Req, Res, UnauthorizedException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import type { Providers } from './providers.mjs';
import { AuthStore, randomToken, stateLifetime } from './store.mjs';
import type { ProviderId } from './store.mjs';

const appCallback = 'bugmap://auth/callback';
const opaqueToken = /^[A-Za-z0-9_-]{43}$/;
const pkceVerifier = /^[A-Za-z0-9._~-]{43,128}$/;
const appState = /^[A-Za-z0-9._~-]{1,256}$/;
const accessToken = /^[a-f0-9-]{36}\.[A-Za-z0-9_-]{43}$/;
const cancelErrors = new Set(['access_denied', 'user_cancelled_authorize']);
const providersToken = Symbol('providers');

function providerId(value: unknown): ProviderId {
  if (value === 'kakao' || value === 'google' || value === 'apple') return value;
  throw new BadRequestException('Invalid provider');
}

function textValue(input: unknown, key: string): string {
  if (input === null || typeof input !== 'object' || !Object.hasOwn(input, key)) return '';
  const value: unknown = (input as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

function appUrl(state: string, outcome: { code: string } | { error: string }): string {
  const url = new URL(appCallback);
  url.search = new URLSearchParams({ state, ...outcome }).toString();
  return url.href;
}

function browserCookieName(state: string): string {
  return '__Host-bugmap-' + state;
}

function readBrowserCookie(request: Request, name: string): string {
  const cookie = request.headers.cookie?.split(';').map(item => item.trim())
    .find(item => item.startsWith(name + '='));
  return cookie?.slice(name.length + 1) ?? '';
}

const browserCookie = { path: '/', secure: true, httpOnly: true, sameSite: 'none' } as const;

@Injectable()
class StoreShutdown implements OnApplicationShutdown {
  constructor(@Inject(AuthStore) private readonly store: AuthStore) {}

  onApplicationShutdown(): void {
    this.store.close();
  }
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

@Controller('v1/auth')
class AuthController {
  constructor(
    @Inject(AuthStore) private readonly store: AuthStore,
    @Inject(providersToken) private readonly providers: Providers,
  ) {}

  @Get('authorize/:provider')
  authorize(@Param('provider') id: string, @Query() query: unknown, @Res() response: Response): void {
    const provider = providerId(id);
    const state = textValue(query, 'state');
    const challenge = textValue(query, 'code_challenge');
    if (textValue(query, 'redirect_uri') !== appCallback ||
        textValue(query, 'code_challenge_method') !== 'S256' ||
        !appState.test(state) || !opaqueToken.test(challenge)) {
      throw new BadRequestException('Invalid app authorization');
    }
    const adapter = this.providers[provider];
    if (!adapter) {
      response.redirect(303, appUrl(state, { error: 'provider_unavailable' }));
      return;
    }

    const providerState = randomToken();
    const browser = randomToken();
    const nonce = randomToken();
    const providerVerifier = randomToken();
    const destination = adapter.authorize({ state: providerState, nonce, providerVerifier });
    this.store.createAuthorization(providerState, browser, { provider, appState: state, challenge, nonce, providerVerifier });
    response.cookie(browserCookieName(providerState), browser, { ...browserCookie, maxAge: stateLifetime });
    response.redirect(302, destination.href);
  }

  @Get('callback/:provider')
  async queryCallback(
    @Param('provider') id: string, @Query() query: unknown, @Req() request: Request, @Res() response: Response,
  ): Promise<void> {
    const provider = providerId(id);
    if (provider === 'apple') throw new BadRequestException('Expected Apple form_post');
    await this.complete(provider, query, request, response);
  }

  @Post('callback/apple')
  async appleCallback(@Body() body: unknown, @Req() request: Request, @Res() response: Response): Promise<void> {
    if (!request.is('application/x-www-form-urlencoded')) throw new UnsupportedMediaTypeException();
    await this.complete('apple', body, request, response);
  }

  @Post('exchange')
  @HttpCode(200)
  exchange(@Body() body: unknown) {
    const provider = providerId(textValue(body, 'provider'));
    const code = textValue(body, 'code');
    const verifier = textValue(body, 'codeVerifier');
    if (textValue(body, 'redirectUri') !== appCallback || !opaqueToken.test(code) || !pkceVerifier.test(verifier)) {
      throw new BadRequestException('Invalid app code exchange');
    }
    const result = this.store.exchange(provider, code, verifier);
    if (!result) throw new UnauthorizedException();
    return result;
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() body: unknown) {
    const token = textValue(body, 'refreshToken');
    const result = opaqueToken.test(token) ? this.store.rotate(token) : undefined;
    if (!result) throw new UnauthorizedException();
    return result;
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Body() body: unknown): void {
    const token = textValue(body, 'refreshToken');
    if (!opaqueToken.test(token) || !this.store.revoke(token)) throw new UnauthorizedException();
  }

  @Get('me')
  me(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = /^Bearer (.+)$/i.exec(request.headers.authorization ?? '')?.[1] ?? '';
    const user = accessToken.test(token) ? this.store.findAccessUser(token) : undefined;
    if (!user) {
      response.set('WWW-Authenticate', 'Bearer');
      throw new UnauthorizedException();
    }
    return user;
  }

  private async complete(provider: ProviderId, data: unknown, request: Request, response: Response): Promise<void> {
    const state = textValue(data, 'state');
    if (!opaqueToken.test(state)) throw new BadRequestException('Invalid provider state');
    const cookieName = browserCookieName(state);
    const browser = readBrowserCookie(request, cookieName);
    const authorization = opaqueToken.test(browser) ? this.store.consumeAuthorization(provider, state, browser) : undefined;
    if (!authorization) throw new BadRequestException('Invalid provider state');
    response.clearCookie(cookieName, browserCookie);

    const providerError = textValue(data, 'error');
    const code = textValue(data, 'code');
    const adapter = this.providers[provider];
    if (providerError || !code || code.length > 4_096 || !adapter) {
      const error = cancelErrors.has(providerError) ? 'access_denied' : 'login_failed';
      response.redirect(303, appUrl(authorization.appState, { error }));
      return;
    }

    let subject: string;
    try {
      ({ subject } = await adapter.identify(code, authorization));
    } catch {
      response.redirect(303, appUrl(authorization.appState, { error: 'login_failed' }));
      return;
    }
    response.redirect(303, appUrl(authorization.appState, { code: this.store.createCode(authorization, subject) }));
  }
}

export async function createAuthApp(store: AuthStore, providers: Providers): Promise<NestExpressApplication> {
  @Module({
    controllers: [AuthController, HealthController],
    providers: [
      { provide: AuthStore, useValue: store },
      { provide: providersToken, useValue: providers },
      StoreShutdown,
    ],
  })
  class AuthModule {}

  const app = await NestFactory.create<NestExpressApplication>(AuthModule, { bodyParser: false, logger: false });
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

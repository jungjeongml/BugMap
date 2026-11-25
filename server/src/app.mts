import 'reflect-metadata';
import { isIP } from 'node:net';
import {
  BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, HttpCode, Inject, Injectable, Module,
  NotFoundException, Param, Post, Query, Req, Res, UnauthorizedException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import type { Providers } from './providers.mjs';
import { AuthStore, randomToken, sessionLifetime, stateLifetime } from './store.mjs';
import type { ProviderId } from './store.mjs';

const appCallback = 'bugmap://auth/callback';
const opaqueToken = /^[A-Za-z0-9_-]{43}$/;
const pkceVerifier = /^[A-Za-z0-9._~-]{43,128}$/;
const appState = /^[A-Za-z0-9._~-]{1,256}$/;
const accessToken = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\.[A-Za-z0-9_-]{43}$/;
const cancelErrors = new Set(['access_denied', 'user_cancelled_authorize']);
const providersToken = Symbol('providers');
const webOriginToken = Symbol('webOrigin');
const webScopePrefix = 'web:';

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

function webScope(origin: URL): string {
  // Keep in-flight web codes and sessions bound to their original app origin without a DB migration.
  return webScopePrefix + origin.href;
}

function webCookie(origin: URL) {
  const secure = origin.protocol === 'https:';
  return {
    name: secure ? '__Host-bugmap-session' : 'bugmap-session',
    options: { path: '/', secure, httpOnly: true, sameSite: 'lax' } as const,
  };
}

function providerId(value: unknown): ProviderId {
  if (value === 'kakao' || value === 'google' || value === 'apple') return value;
  throw new BadRequestException('Invalid provider');
}

function webProviderId(value: unknown): 'google' | 'kakao' {
  if (value === 'google' || value === 'kakao') return value;
  throw new BadRequestException('Invalid web provider');
}

function textValue(input: unknown, key: string): string {
  if (input === null || typeof input !== 'object' || !Object.hasOwn(input, key)) return '';
  const value: unknown = (input as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

function appUrl(destination: string, state: string, outcome: { code: string } | { error: string }): string {
  const url = new URL(destination);
  url.search = new URLSearchParams({ state, ...outcome }).toString();
  return url.href;
}

function browserCookieName(state: string): string {
  return '__Host-bugmap-' + state;
}

function readCookie(request: Request, name: string): string {
  const cookie = request.headers.cookie?.split(';').map(item => item.trim())
    .find(item => item.startsWith(name + '='));
  return cookie?.slice(name.length + 1) ?? '';
}

const browserCookie = { path: '/', secure: true, httpOnly: true, sameSite: 'none' } as const;

@Injectable()
class StoreShutdown implements OnApplicationShutdown {
  constructor(@Inject(AuthStore) private readonly store: AuthStore) {}

  onApplicationShutdown(): Promise<void> {
    return this.store.close();
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
    @Inject(webOriginToken) private readonly webOrigin: URL | null,
  ) {}

  @Get('authorize/:provider')
  async authorize(@Param('provider') id: string, @Query() query: unknown, @Res() response: Response): Promise<void> {
    await this.begin(providerId(id), query, response, appCallback);
  }

  @Get('web/authorize/:provider')
  async webAuthorize(@Param('provider') id: string, @Query() query: unknown, @Res() response: Response): Promise<void> {
    const origin = this.requireWebOrigin();
    await this.begin(webProviderId(id), query, response, origin.href, webScope(origin));
  }

  private async begin(provider: ProviderId, query: unknown, response: Response, destination: string, scope = ''): Promise<void> {
    const state = textValue(query, 'state');
    const challenge = textValue(query, 'code_challenge');
    if (textValue(query, 'redirect_uri') !== destination ||
        textValue(query, 'code_challenge_method') !== 'S256' ||
        !appState.test(state) || !opaqueToken.test(challenge)) {
      throw new BadRequestException('Invalid app authorization');
    }
    const adapter = this.providers[provider];
    if (!adapter) {
      response.redirect(303, appUrl(destination, state, { error: 'provider_unavailable' }));
      return;
    }

    const providerState = randomToken();
    const browser = randomToken();
    const nonce = randomToken();
    const providerVerifier = randomToken();
    const providerUrl = adapter.authorize({ state: providerState, nonce, providerVerifier });
    await this.store.createAuthorization(providerState, browser, {
      provider, appState: scope + state, challenge: scope + challenge, nonce, providerVerifier,
    });
    response.cookie(browserCookieName(providerState), browser, { ...browserCookie, maxAge: stateLifetime });
    response.redirect(302, providerUrl.href);
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
  async exchange(@Body() body: unknown) {
    const provider = providerId(textValue(body, 'provider'));
    const code = textValue(body, 'code');
    const verifier = textValue(body, 'codeVerifier');
    if (textValue(body, 'redirectUri') !== appCallback || !opaqueToken.test(code) || !pkceVerifier.test(verifier)) {
      throw new BadRequestException('Invalid app code exchange');
    }
    const result = await this.store.exchange(provider, code, verifier);
    if (!result) throw new UnauthorizedException();
    return result;
  }

  @Post('web/exchange')
  @HttpCode(200)
  async webExchange(@Body() body: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const origin = this.requireWebOrigin(request);
    if (!request.is('application/json')) throw new UnsupportedMediaTypeException();
    const provider = webProviderId(textValue(body, 'provider'));
    const code = textValue(body, 'code');
    const verifier = textValue(body, 'codeVerifier');
    if (!opaqueToken.test(code) || !pkceVerifier.test(verifier)) {
      throw new BadRequestException('Invalid web code exchange');
    }
    const session = await this.store.exchange(provider, code, verifier, webScope(origin));
    if (!session) throw new UnauthorizedException();
    const cookie = webCookie(origin);
    response.cookie(cookie.name, session.refreshToken, { ...cookie.options, maxAge: sessionLifetime });
    return { userId: session.userId, displayName: session.displayName };
  }

  @Get('web/session')
  async webSession(@Req() request: Request) {
    const origin = this.requireWebOrigin();
    const token = readCookie(request, webCookie(origin).name);
    const session = opaqueToken.test(token) ? await this.store.findSessionUser(token, webScope(origin)) : undefined;
    if (!session) throw new UnauthorizedException();
    return session;
  }

  @Post('web/nickname')
  @HttpCode(200)
  async webNickname(@Body() body: unknown, @Req() request: Request) {
    const origin = this.requireWebOrigin(request);
    if (!request.is('application/json')) throw new UnsupportedMediaTypeException();
    const token = readCookie(request, webCookie(origin).name);
    const session = opaqueToken.test(token) ? await this.store.findSessionUser(token, webScope(origin)) : undefined;
    if (!session || textValue(body, 'userId') !== session.userId) throw new UnauthorizedException();
    return this.saveNickname(session.userId, body);
  }

  @Post('nickname')
  @HttpCode(200)
  async nickname(@Body() body: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.saveNickname((await this.me(request, response)).userId, body);
  }

  private async saveNickname(userId: string, body: unknown) {
    const displayName = textValue(body, 'displayName').trim().normalize('NFC');
    const length = [...displayName].length;
    if (length < 2 || length > 12 || /[\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/u.test(displayName)) {
      throw new BadRequestException('Invalid nickname');
    }
    const user = await this.store.setupNickname(userId, displayName);
    if (!user) throw new ConflictException('Nickname unavailable');
    return user;
  }

  @Post('web/logout')
  @HttpCode(204)
  async webLogout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    const origin = this.requireWebOrigin(request);
    const cookie = webCookie(origin);
    const token = readCookie(request, cookie.name);
    if (opaqueToken.test(token)) await this.store.revoke(token, webScope(origin));
    response.clearCookie(cookie.name, cookie.options);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: unknown) {
    const token = textValue(body, 'refreshToken');
    const result = opaqueToken.test(token) ? await this.store.rotate(token) : undefined;
    if (!result) throw new UnauthorizedException();
    return result;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() body: unknown): Promise<void> {
    const token = textValue(body, 'refreshToken');
    if (!opaqueToken.test(token) || !(await this.store.revoke(token))) throw new UnauthorizedException();
  }

  @Get('me')
  async me(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = /^Bearer (.+)$/i.exec(request.headers.authorization ?? '')?.[1] ?? '';
    const user = accessToken.test(token) ? await this.store.findAccessUser(token) : undefined;
    if (!user) {
      response.set('WWW-Authenticate', 'Bearer');
      throw new UnauthorizedException();
    }
    return user;
  }

  private requireWebOrigin(request?: Request): URL {
    if (!this.webOrigin) throw new NotFoundException();
    if (request && request.headers.origin !== this.webOrigin.origin) throw new ForbiddenException();
    return this.webOrigin;
  }

  private async complete(provider: ProviderId, data: unknown, request: Request, response: Response): Promise<void> {
    const state = textValue(data, 'state');
    if (!opaqueToken.test(state)) throw new BadRequestException('Invalid provider state');
    const cookieName = browserCookieName(state);
    const browser = readCookie(request, cookieName);
    const authorization = opaqueToken.test(browser) ? await this.store.consumeAuthorization(provider, state, browser) : undefined;
    if (!authorization) throw new BadRequestException('Invalid provider state');
    response.clearCookie(cookieName, browserCookie);

    const web = authorization.appState.startsWith(webScopePrefix);
    const origin = web ? this.requireWebOrigin() : undefined;
    const scope = origin ? webScope(origin) : '';
    if (!authorization.appState.startsWith(scope)) throw new BadRequestException('Invalid provider state');
    const appState = authorization.appState.slice(scope.length);
    const destination = origin?.href ?? appCallback;

    const providerError = textValue(data, 'error');
    const code = textValue(data, 'code');
    const adapter = this.providers[provider];
    if (providerError || !code || code.length > 4_096 || !adapter) {
      const error = cancelErrors.has(providerError) ? 'access_denied' : 'login_failed';
      response.redirect(303, appUrl(destination, appState, { error }));
      return;
    }

    let subject: string;
    try {
      ({ subject } = await adapter.identify(code, authorization));
    } catch {
      response.redirect(303, appUrl(destination, appState, { error: 'login_failed' }));
      return;
    }
    response.redirect(303, appUrl(destination, appState, { code: await this.store.createCode(authorization, subject) }));
  }
}

export async function createAuthApp(
  store: AuthStore, providers: Providers, webOrigin?: URL,
): Promise<NestExpressApplication> {
  @Module({
    controllers: [AuthController, HealthController],
    providers: [
      { provide: AuthStore, useValue: store },
      { provide: providersToken, useValue: providers },
      { provide: webOriginToken, useValue: webOrigin ?? null },
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

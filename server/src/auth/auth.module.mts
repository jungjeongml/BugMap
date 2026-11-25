import { Inject, Injectable, Module } from '@nestjs/common';
import type { DynamicModule, OnApplicationShutdown } from '@nestjs/common';
import { AuthController, providersToken, webOriginToken } from './auth.controller.mjs';
import { AuthStore } from './auth.store.mjs';
import type { Providers } from './providers.mjs';

@Injectable()
class StoreShutdown implements OnApplicationShutdown {
  constructor(@Inject(AuthStore) private readonly store: AuthStore) {}

  onApplicationShutdown(): Promise<void> {
    return this.store.close();
  }
}

@Module({ controllers: [AuthController] })
export class AuthModule {
  static register(store: AuthStore, providers: Providers, webOrigin?: URL): DynamicModule {
    return {
      module: AuthModule,
      providers: [
        { provide: AuthStore, useValue: store },
        { provide: providersToken, useValue: providers },
        { provide: webOriginToken, useValue: webOrigin ?? null },
        StoreShutdown,
      ],
      exports: [providersToken],
    };
  }
}

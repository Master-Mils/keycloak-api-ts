import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import axiosRetry, { exponentialDelay, isNetworkOrIdempotentRequestError } from 'axios-retry';

import { Credentials, KeycloakAuthError, TokenManager, TokenResponse } from './auth';
import { HttpClient } from './api/http';
import Authentication from './api/authentication';
import Clients from './api/clients';
import Components from './api/components';
import Groups from './api/groups';
import Realms from './api/realms';
import Roles from './api/roles';
import Users from './api/users';
import UserStorageProvider from './api/user-storage-provider';

export interface ServerSettings {
  /** Server root URL, e.g. `https://sso.example.com` (append `/auth` only if the server uses that relative path). */
  baseUrl: string;
  /** Realm used to authenticate. Defaults to `master`. */
  realmName?: string;
  credentials: Credentials;
  /** Extra axios options applied to every request (timeouts, proxies, TLS agents...). */
  requestConfig?: AxiosRequestConfig;
  /** Retries for network errors, 408, 429 and 5xx on idempotent requests. Defaults to 3; 0 disables. */
  retries?: number;
  /** Client-side rate limit. Defaults to 10 requests per second; 0 disables. */
  requestsPerSecond?: number;
}

export default class KeycloakAPI {
  readonly config: ServerSettings;
  readonly httpClient: AxiosInstance;

  readonly authentication: Authentication;
  readonly clients: Clients;
  readonly components: Components;
  readonly groups: Groups;
  readonly realms: Realms;
  readonly roles: Roles;
  readonly users: Users;
  readonly userStorageProvider: UserStorageProvider;

  private readonly tokens: TokenManager;

  /**
   * @param autoRefreshToken renew the access token in the background before it expires.
   *   Tokens are always renewed on demand, so this is only useful to keep an SSO session alive.
   */
  constructor(settings: ServerSettings, autoRefreshToken: boolean = false) {
    const baseUrl = settings.baseUrl.replace(/\/+$/, '');
    this.config = { ...settings, baseUrl };

    this.tokens = new TokenManager({
      baseUrl,
      realmName: settings.realmName || 'master',
      credentials: settings.credentials,
      requestConfig: settings.requestConfig,
      autoRefresh: autoRefreshToken,
    });

    this.httpClient = axios.create({
      ...settings.requestConfig,
      baseURL: `${baseUrl}/admin/realms`,
    });
    this.httpClient.interceptors.request.use(async (config) => {
      const { accessToken } = await this.tokens.getToken();
      config.headers.Authorization = `Bearer ${accessToken}`;
      return config;
    });
    throttle(this.httpClient, settings.requestsPerSecond ?? 10);
    axiosRetry(this.httpClient, {
      retries: settings.retries ?? 3,
      retryDelay: exponentialDelay,
      retryCondition: (error) =>
        isNetworkOrIdempotentRequestError(error) || [408, 429].includes(error.response?.status ?? 0),
    });

    const http = new HttpClient(this.httpClient, () => this.tokens.invalidate());
    this.authentication = new Authentication(http);
    this.clients = new Clients(http);
    this.components = new Components(http);
    this.groups = new Groups(http);
    this.realms = new Realms(http);
    this.roles = new Roles(http);
    this.users = new Users(http);
    this.userStorageProvider = new UserStorageProvider(http);
  }

  /** Returns a valid access token for the configured credentials. Throws `KeycloakAuthError` on failure. */
  getToken(): Promise<TokenResponse> {
    return this.tokens.getToken();
  }

  setTokenAutoRefresh(flag: boolean): void {
    this.tokens.autoRefresh = flag;
  }

  /** Stops background token renewal and forgets the cached token. */
  dispose(): void {
    this.tokens.dispose();
  }
}

/** Spaces out requests so that at most `requestsPerSecond` start each second. */
function throttle(instance: AxiosInstance, requestsPerSecond: number): void {
  if (!requestsPerSecond || requestsPerSecond <= 0) {
    return;
  }
  const interval = 1000 / requestsPerSecond;
  let nextSlot = 0;
  instance.interceptors.request.use(async (config) => {
    const now = Date.now();
    const wait = Math.max(0, nextSlot - now);
    nextSlot = Math.max(now, nextSlot) + interval;
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    return config;
  });
}

export { KeycloakAPI, KeycloakAuthError, HttpClient };
export type { Credentials, TokenResponse };
export type { GrantType } from './auth';
export type { ClientListQueryParameters } from './api/clients';
export type { ComponentListQueryParameters } from './api/components';
export type { GroupListQueryParameters } from './api/groups';
export type { RoleListQueryParameters } from './api/roles';
export type { UserListQueryParameters, UserCountQueryParameters } from './api/users';
export type { ActionType, DirectionType, SynchronizationResult } from './api/user-storage-provider';
export { USER_STORAGE_PROVIDER_TYPE, LDAP_STORAGE_MAPPER_TYPE } from './api/user-storage-provider';
export type { NewSubFlow } from './api/authentication/executions';
export * from './types';
export type { components as KeycloakSchemas } from './generated/keycloak-admin';
export { KEYCLOAK_SPEC_VERSION } from './generated/keycloak-admin';

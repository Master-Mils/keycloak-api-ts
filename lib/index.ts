import axios, { Axios, AxiosRequestConfig, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import axiosThrottle from 'axios-request-throttle';

import { Issuer, TokenSet, BaseClient } from 'openid-client';
import querystring from 'query-string';
import camelize from 'camelize';

import Authentication from './api/authentication';
import Clients from './api/clients';
import Realms from './api/realms';
import Users from './api/users';

axiosRetry(axios, {
  retries: 10,
  retryCondition: (error) => {
    if ([401, 408, 429].includes(Number(error.response?.status || 0))) {
      return true;
    }
    if (error.code === 'ECONNABORTED') {
      return true;
    }
    return axiosRetry.isNetworkOrIdempotentRequestError(error);
  },
  retryDelay: axiosRetry.exponentialDelay,
});

axiosThrottle.use(axios, { requestsPerSecond: 10 });

export interface ServerSettings {
  realmName?: string;
  baseUrl: string;
  credentials: {
    username?: string;
    password?: string;
    grantType: 'client_credentials' | 'password' | 'refresh_token';
    clientId: string;
    clientSecret?: string;
    totp?: string;
    offlineToken?: boolean;
    refreshToken?: string;
  };
  requestConfig?: AxiosRequestConfig;
}

export interface TokenResponse {
  accessToken: string;
  expiresIn: string;
  refreshExpiresIn: number;
  refreshToken: string;
  tokenType: string;
  notBeforePolicy: number;
  sessionState: string;
  scope: string;
}

interface TokenResponseRaw {
  access_token: string | undefined;
  expires_in: string;
  refresh_expires_in?: number;
  refresh_token?: string;
  token_type?: string;
  not_before_policy?: number;
  session_state?: string;
  scope?: string;
}

export default class KeycloakAPI {
  autoRefreshTimer: NodeJS.Timer | undefined;
  autoRefreshToken: boolean = false;

  tokenSet: TokenSet | undefined;
  oidcClient: BaseClient | undefined;

  currentTokenInfo: TokenResponseRaw | undefined;
  config: ServerSettings;
  httpClient: Axios;

  authentication: Authentication;
  clients: Clients;
  realms: Realms;
  users: Users;

  constructor(settings: ServerSettings, autoRefreshToken: boolean = false) {
    this.config = settings;
    this.autoRefreshToken = autoRefreshToken;
    this.httpClient = axios.create({
      baseURL: `${this.config.baseUrl}/admin/realms`,
    });
    this.httpClient.interceptors.request.use(async (config) => {
      config.headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await this.getToken(this.config)).accessToken}`,
      };
      return config;
    });

    this.authentication = new Authentication(this.httpClient);
    this.clients = new Clients(this.httpClient);
    this.realms = new Realms(this.httpClient);
    this.users = new Users(this.httpClient);
  }

  async getToken(settings: ServerSettings): Promise<TokenResponse> {
    if (!this.currentTokenInfo?.access_token) {
      // Construct URL
      const baseUrl = settings.baseUrl;
      const realmName = settings.realmName || 'master';
      const url = `${baseUrl}/realms/${realmName}/protocol/openid-connect/token`;

      // Prepare credentials for openid-connect token request
      // ref: http://openid.net/specs/openid-connect-core-1_0.html#TokenEndpoint
      const credentials = settings.credentials || ({} as any);
      const payload = querystring.stringify({
        username: credentials.username,
        password: credentials.password,
        grant_type: credentials.grantType,
        client_id: credentials.clientId,
        totp: credentials.totp,
        ...(credentials.offlineToken ? { scope: 'offline_access' } : {}),
        ...(credentials.refreshToken
          ? {
              refresh_token: credentials.refreshToken,
              client_secret: credentials.clientSecret,
            }
          : {}),
      });

      const config: AxiosRequestConfig = {
        ...settings.requestConfig,
      };

      if (credentials.clientSecret) {
        config.auth = {
          username: credentials.clientId,
          password: credentials.clientSecret,
        };
      }

      const { data } = await axios.post<any, AxiosResponse<TokenResponseRaw>>(url, payload, config).catch((err) => {
        return err.response?.data ? err.response.data : err.response ? err.response : err;
      });

      // console.log('new TokenInfo');
      this.currentTokenInfo = data;
    }

    if (this.autoRefreshToken) {
      this.tokenSet = await Issuer.discover(`${this.config.baseUrl}/realms/${this.config.realmName}`)
        .then(async (keycloakIssuer) => {
          this.oidcClient = new keycloakIssuer.Client({
            client_id: this.config.credentials.clientId,
            token_endpoint_auth_method: 'none', // to send only client_id in the header
          });

          // Use the grant type 'password'
          return this.oidcClient.grant({
            grant_type: 'password',
            username: this.config.credentials.username,
            password: this.config.credentials.password,
          });
        })
        .catch((error) => {
          // console.log(error);
          return undefined;
        });

      // Periodically using refresh_token grant flow to get new access token here
      this.autoRefreshTimer = setInterval(async () => {
        const refreshToken = this.tokenSet?.refresh_token;
        if (this.autoRefreshToken && refreshToken) {
          this.tokenSet = await this.oidcClient?.refresh(refreshToken);
          this.currentTokenInfo = {
            access_token: this.tokenSet?.access_token,
            expires_in: this.tokenSet?.expires_in ? String(this.tokenSet?.expires_in) : '',
            refresh_token: this.tokenSet?.refresh_token,
            scope: this.tokenSet?.scope,
            token_type: this.tokenSet?.token_type,
            session_state: this.tokenSet?.session_state,
          };
        } else {
          clearInterval(this.autoRefreshTimer);
        }
        // console.log('tokenSet refreshed');
      }, 58 * 1000); // 58 seconds
    }

    return camelize(this.currentTokenInfo);
  }

  setTokenAutoRefresh(flag: boolean): void {
    this.autoRefreshToken = flag;

    if (!this.autoRefreshToken && this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
    }
    if (this.autoRefreshTimer && !this.autoRefreshTimer) {
      this.currentTokenInfo = undefined;
    }
  }
}

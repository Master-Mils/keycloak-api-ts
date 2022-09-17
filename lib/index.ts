import axios, { Axios, AxiosRequestConfig, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';

import { Issuer } from 'openid-client';
import querystring from 'query-string';
import camelize from 'camelize';

import Authentication from './api/authentication';
import Clients from './api/clients';
import Realms from './api/realms';
import Users from './api/users';

axiosRetry(
  axios,
  {
    retries: 3,
    retryCondition: (error) => {
      if ([408, 429].includes(Number(error.response?.status || 0))) {
        return true;
      }
      return axiosRetry.isNetworkOrIdempotentRequestError(error);
    },
    retryDelay: axiosRetry.exponentialDelay
  }
);

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

  currentTokenInfo: TokenResponseRaw | undefined;
  config: ServerSettings;
  httpClient: Axios;

  authentication: Authentication;
  clients: Clients;
  realms: Realms;
  users: Users;

  constructor(settings: ServerSettings) {
    this.config = settings;
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

      console.log('new TokenInfo');
      this.currentTokenInfo = data;

    }
    return camelize(this.currentTokenInfo);
  }

  async startTokenAutoRefresh(): Promise<void> {
    if (!this.autoRefreshTimer) {

      const keycloakIssuer = await Issuer.discover(`${this.config.baseUrl}/realms/${this.config.realmName}`);

      const client = new keycloakIssuer.Client({
        client_id: this.config.credentials.clientId,
        token_endpoint_auth_method: 'none', // to send only client_id in the header
      });

      // Use the grant type 'password'
      let tokenSet = await client.grant({
        grant_type: 'password',
        username: this.config.credentials.username,
        password: this.config.credentials.password,
      });

      // Periodically using refresh_token grant flow to get new access token here
      this.autoRefreshTimer = setInterval(async () => {
        const refreshToken = tokenSet.refresh_token;
        if (refreshToken) {
          tokenSet = await client.refresh(refreshToken);
          this.currentTokenInfo = {
            access_token: tokenSet.access_token,
            expires_in: tokenSet.expires_in ? String(tokenSet.expires_in) : '',
            refresh_token: tokenSet.refresh_token,
            scope: tokenSet.scope,
            token_type: tokenSet.token_type,
            session_state: tokenSet.session_state
          };
        }
        console.log('tokenSet refreshed');
      }, 58 * 1000); // 58 seconds
    }
  }
  stopTokenAutoRefresh(): void {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
    }
  }
}

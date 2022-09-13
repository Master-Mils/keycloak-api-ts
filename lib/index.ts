import axios, { Axios, AxiosRequestConfig, AxiosResponse } from 'axios';

import querystring from 'query-string';


// import ServerSettings from './types/server-settings';

import Authentication from './api/authentication';
import Clients from './api/clients';
import Realms from './api/realms';
import Users from './api/users';

interface Credentials {
  username?: string;
  password?: string;
  grantType: 'client_credentials' | 'password' | 'refresh_token';
  clientId: string;
  clientSecret?: string;
  totp?: string;
  offlineToken?: boolean;
  refreshToken?: string;
}
interface ServerSettings {
  realmName?: string;
  baseUrl: string;
  credentials: Credentials;
  requestConfig?: AxiosRequestConfig;
}

interface TokenResponse {
  accessToken: string;
  expiresIn: string;
  refreshExpiresIn: number;
  refreshToken: string;
  tokenType: string;
  notBeforePolicy: number;
  sessionState: string;
  scope: string;
}

export interface TokenResponseRaw {
  access_token: string;
  expires_in: string;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
  not_before_policy: number;
  session_state: string;
  scope: string;
}

class KeycloakAPI {
  config: ServerSettings;
  httpClient: Axios;

  authentication: Authentication;
  clients: Clients;
  realms: Realms;
  users: Users;

  constructor(settings: ServerSettings) {
    this.config = settings;
    this.httpClient = new Axios({
      baseURL: `${this.config.baseUrl}/admin/realms`,
    });
    this.httpClient.interceptors.request.use(async (config) => {
      config.headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await this.getToken(this.config)}`,
      };
      return config;
    });

    this.authentication = new Authentication(this.httpClient);
    this.clients = new Clients(this.httpClient);
    this.realms = new Realms(this.httpClient);
    this.users = new Users(this.httpClient);
  }

//   async getToken(settings: ServerSettings): Promise<any> {
//     settings.realmName = settings.realmName ? settings.realmName : 'master';

//     const options = {
//       method: 'POST',
//       url: `${settings.baseUrl}/realms/${settings.realmName}/protocol/openid-connect/token`,
//       headers: {
//         'Content-Type': 'application/x-www-form-urlencoded',
//       },
//       data: new URLSearchParams(settings),
//     };

//     return await axios
//       .request(options)
//       .then((response) => {
//         if (response.status !== 200) {
//           return response.data;
//         } else {
//           return response.data.access_token;
//         }
//       })
//       .catch((error) => {
//         return error;
//       });
//   }

  async getToken(settings: ServerSettings): Promise<TokenResponseRaw> {
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
      ...(credentials.refreshToken ? {
        refresh_token: credentials.refreshToken,
        client_secret: credentials.clientSecret,
      } : {}),
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

    const { data } = await axios.post<any, AxiosResponse<TokenResponseRaw>>(url, payload, config);
    return data;
  };

}






export default KeycloakAPI;

import axios, { Axios } from 'axios';

import ServerSettings from './types/server-settings';

import Authentication from './api/authentication';
import Clients from './api/clients';
import Realms from './api/realms';
import Users from './api/users';

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

  async getToken(settings: ServerSettings): Promise<any> {
    settings.realmName = settings.realmName ? settings.realmName : 'master';

    const options = {
      url: `${settings.baseUrl}/realms/${settings.realmName}/protocol/openid-connect/token`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams({
        grant_type: settings.grant_type,
        client_id: settings.client_id,
        password: settings.password,
        username: settings.username,
      }),
    };

    return await axios
      .request(options)
      .then((response) => {
        if (response.status !== 200) {
          return response.data;
        } else {
          return response.data.access_token;
        }
      })
      .catch((error) => {
        return error;
      });
  }
}

export default KeycloakAPI;

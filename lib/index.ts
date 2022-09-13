import axios, { Axios } from 'axios';
import qs from 'qs';

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
      baseURL: settings.baseUrl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: qs.stringify(settings)
    };

    const axiosTokenClient = axios.create(options);

    // const formBody = Object.entries(settings)
    //   .flatMap(([key, value]) => `${key}=${value}`)
    //   .join('&');

    return await axiosTokenClient
      // .post(`/realms/${settings.realmName}/protocol/openid-connect/token`, formBody)
      .post(`/realms/${settings.realmName}/protocol/openid-connect/token`)
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

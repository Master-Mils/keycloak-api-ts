import { Axios } from "axios";

import Client from '../interfaces/client'

interface ClientListQueryParameters {
  clientId?: string,
  first?: number,
  max?: number,
  search?: boolean,
  viewableOnly?: boolean
}

export default class Clients {

  httpClient: Axios;

  constructor(httpClient: Axios) {
    this.httpClient = httpClient;
  }

  async create(realm: string, data: Client): Promise<Client> {
    const url = `/${realm}/clients`;
    return await this.httpClient
      .post(url, data)
      .then((response) => {
        return JSON.parse(response.data);
      });
  }

  async get(realm: string, id: string): Promise<Client> {
    const url = `/${realm}/clients/${id}`;
    return await this.httpClient
      .get(url)
      .then((response) => {
        return JSON.parse(response.data);
      });
  }


  async list(realm: string, options?: ClientListQueryParameters): Promise<Client[]> {

    let queryParams = options ?
      Object
        .entries(options)
        .flatMap(([key, value]) => `${key}=${value}`)
        .join('&') :
      undefined;

    const url = `/${realm}/clients${queryParams ? '?'.concat(queryParams) : ''}`;

    return await this.httpClient
      .get(url)
      .then((response) => {
        return JSON.parse(response.data);
      });
  }

  async update(realm: string, id: string, data: Client): Promise<boolean> {
    const url = `/${realm}/clients/${id}`;
    return await this.httpClient
      .put(url, data)
      .then((response) => {
        return response.data || false;
      });
  }

  async delete(realm: string, id: string): Promise<boolean> {
    const url = `/${realm}/clients/${id})`;
    return await this.httpClient
      .delete(url)
      .then(() => {
        return true;
      });
  }

}

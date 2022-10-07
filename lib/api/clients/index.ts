import { Axios } from 'axios';

import Client from '../../types/client';
import ApiResponse from '../../types/api-response';

interface ClientListQueryParameters {
  clientId?: string;
  first?: number;
  max?: number;
  search?: boolean;
  viewableOnly?: boolean;
}

export default class Clients {
  httpClient: Axios;

  constructor(httpClient: Axios) {
    this.httpClient = httpClient;
  }

  async create(realm: string, data: Client): Promise<ApiResponse<string>> {
    const url = `/${realm}/clients`;
    return await this.httpClient.post(url, JSON.stringify(data)).then((response) => {
      if (response.status === 201) {
        return { success: true, data: response.data, statusText: response.statusText, status: response.status };
      } else {
        return { success: false, data: response.data, statusText: response.statusText, status: response.status };
      }
    });
  }

  async get(realm: string, id: string): Promise<ApiResponse<Client>> {
    const url = `/${realm}/clients/${id}`;
    return await this.httpClient.get(url).then((response) => {
      if (response.status === 200) {
        return {
          success: true,
          data: response.data,
          status: response.status,
          statusText: response.statusText,
        };
      } else {
        return {
          success: false,
          data: response.data,
          status: response.status,
          statusText: response.statusText,
        };
      }
    });
  }

  async list(realm: string, options?: ClientListQueryParameters): Promise<ApiResponse<Client[]>> {
    const queryParams = options
      ? Object.entries(options)
          .flatMap(([key, value]) => `${key}=${value}`)
          .join('&')
      : undefined;

    const url = `/${realm}/clients${queryParams ? '?'.concat(queryParams) : ''}`;

    return await this.httpClient.get(url).then((response) => {
      if (response.status === 200) {
        return {
          success: true,
          data: response.data,
          status: response.status,
          statusText: response.statusText,
        };
      } else {
        return {
          success: false,
          data: response.data,
          status: response.status,
          statusText: response.statusText,
        };
      }
    });
  }

  async update(realm: string, id: string, data: Client): Promise<ApiResponse<string>> {
    const url = `/${realm}/clients/${id}`;
    return await this.httpClient.put(url, JSON.stringify(data)).then((response) => {
      if (response.status === 204) {
        return { success: true, data: response.data, statusText: response.statusText, status: response.status };
      } else {
        return { success: false, data: response.data, statusText: response.statusText, status: response.status };
      }
    });
  }

  async delete(realm: string, id: string): Promise<ApiResponse<string>> {
    const url = `/${realm}/clients/${id}`;
    return await this.httpClient.delete(url).then((response) => {
      if (response.status === 204) {
        return { success: true, data: response.data, statusText: response.statusText, status: response.status };
      } else {
        return { success: false, data: response.data, statusText: response.statusText, status: response.status };
      }
    });
  }
}

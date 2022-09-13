import { Axios } from 'axios';

import User from '../../types/user';
import ApiResponse from '../../types/api-response';

interface UserListQueryParameters {
  briefRepresentation?: boolean;
  email?: string;
  enabled?: boolean;
  exact?: boolean;
  first?: number;
  firstName?: string;
  lastName?: string;
  max?: number;
  search?: string;
  username?: string;
}

interface UserCountQueryParameters {
  email?: string;
  firstName?: string;
  lastName?: string;
  search?: string;
  username?: string;
}

class Users {
  httpClient: Axios;

  constructor(httpClient: Axios) {
    this.httpClient = httpClient;
  }

  async create(realm: string, data: User): Promise<ApiResponse<string>> {
    const url = `/${realm}/users`;
    return await this.httpClient.post(url, JSON.stringify(data)).then((response) => {
      if (response.status === 201) {
        return { success: true, data: response.statusText, statusText: response.statusText, status: response.status };
      } else {
        return { success: false, data: response.statusText, statusText: response.statusText, status: response.status };
      }
    });
  }

  async get(realm: string, id: string): Promise<ApiResponse<User>> {
    const url = `/${realm}/users/${id}`;
    return await this.httpClient.get(url).then((response) => {
      if (response.status === 200) {
        return { success: true, data: JSON.parse(response.data), status: response.status, statusText: response.statusText };
      } else {
        return { success: false, data: JSON.parse(response.data), status: response.status, statusText: response.statusText };
      }
    });
  }

  async count(realm: string, options?: UserCountQueryParameters): Promise<ApiResponse<number>> {
    const queryParams = options
      ? Object.entries(options)
          .flatMap(([key, value]) => `${key}=${value}`)
          .join('&')
      : undefined;

    const url = `/${realm}/users/count${queryParams ? '?'.concat(queryParams) : ''}`;

    return await this.httpClient.get(url).then((response) => {
      if (response.status === 200) {
        return { success: true, data: response.data };
      } else {
        return { success: false, data: response.data };
      }
    });
  }

  async list(realm: string, options?: UserListQueryParameters): Promise<ApiResponse<User[]>> {
    const queryParams = options
      ? Object.entries(options)
          .flatMap(([key, value]) => `${key}=${value}`)
          .join('&')
      : undefined;

    const url = `/${realm}/users${queryParams ? '?'.concat(queryParams) : ''}`;

    return await this.httpClient.get(url).then((response) => {
      if (response.status === 200) {
        return { success: true, data: JSON.parse(response.data), status: response.status, statusText: response.statusText };
      } else {
        return { success: false, data: JSON.parse(response.data), status: response.status, statusText: response.statusText };
      }
    });
  }

  async update(realm: string, id: string, data: User): Promise<ApiResponse<string>> {
    const url = `/${realm}/users/${id}`;
    return await this.httpClient.put(url, JSON.stringify(data)).then((response) => {
      if (response.status === 204) {
        return { success: true, data: response.statusText, statusText: response.statusText, status: response.status };
      } else {
        return { success: false, data: response.statusText, statusText: response.statusText, status: response.status };
      }
    });
  }

  async delete(realm: string, id: string): Promise<ApiResponse<string>> {
    const url = `/${realm}/users/${id})`;
    return await this.httpClient.delete(url).then((response) => {
      if (response.status === 204) {
        return { success: true, data: response.statusText, statusText: response.statusText, status: response.status };
      } else {
        return { success: false, data: response.statusText, statusText: response.statusText, status: response.status };
      }
    });
  }
}

export default Users;

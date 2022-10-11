import { Axios } from 'axios';

import Role from '../../types/role';
import ApiResponse from '../../types/api-response';

class Roles {
  httpClient: Axios;

  constructor(httpClient: Axios) {
    this.httpClient = httpClient;
  }

  async create(realm: string, data: Role): Promise<ApiResponse<string>> {
    const url = `/${realm}/roles`;
    return await this.httpClient.post(url, JSON.stringify(data)).then((response) => {
      if (response.status === 201) {
        return { success: true, data: response.data, statusText: response.statusText, status: response.status };
      } else {
        return { success: false, data: response.data, statusText: response.statusText, status: response.status };
      }
    });
  }

  async get(realm: string, roleName: string): Promise<ApiResponse<Role>> {
    const url = `/${realm}/roles/${roleName}`;
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

  async list(realm: string): Promise<ApiResponse<Role[]>> {
    const url = `/${realm}/roles`;

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

  async update(realm: string, roleName: string, data: Role): Promise<ApiResponse<string>> {
    const url = `/${realm}/roles/${roleName}`;
    return await this.httpClient.put(url, JSON.stringify(data)).then((response) => {
      if (response.status === 204) {
        return { success: true, data: response.data, statusText: response.statusText, status: response.status };
      } else {
        return { success: false, data: response.data, statusText: response.statusText, status: response.status };
      }
    });
  }

  async delete(realm: string, roleName: string): Promise<ApiResponse<string>> {
    const url = `/${realm}/roles/${roleName}`;
    return await this.httpClient.delete(url).then((response) => {
      if (response.status === 204) {
        return { success: true, data: response.data, statusText: response.statusText, status: response.status };
      } else {
        return { success: false, data: response.data, statusText: response.statusText, status: response.status };
      }
    });
  }
}

export default Roles;

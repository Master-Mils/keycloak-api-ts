import { Axios } from 'axios';

import AuthenticationFlow from '../../types/authentication-flow';
import AuthenticationExecutionInfo from '../../types/authentication-execution-info';
import ApiResponse from '../../types/api-response';

class Executions {
  httpClient: Axios;

  constructor(httpClient: Axios) {
    this.httpClient = httpClient;
  }

  async create(realm: string, data: AuthenticationFlow): Promise<ApiResponse<string>> {
    const url = `/${realm}/authentication/flows`;
    return await this.httpClient.post(url, JSON.stringify(data)).then((response) => {
      if (response.status === 201) {
        return { success: true, data: response.statusText };
      } else {
        return { success: true, data: response.statusText };
      }
    });
  }

  async get(realm: string, flowAlias: string): Promise<ApiResponse<AuthenticationExecutionInfo>> {
    const url = `/${realm}/authentication/flows/${flowAlias}/executions`;
    return await this.httpClient.get(url).then((response) => {
      if (response.status === 200) {
        return { success: true, data: JSON.parse(response.data) };
      } else {
        return { success: false, data: JSON.parse(response.data) };
      }
    });
  }

  async list(realm: string): Promise<ApiResponse<AuthenticationFlow[]>> {
    const url = `/${realm}/authentication/flows`;
    return await this.httpClient.get(url).then((response) => {
      if (response.status === 200) {
        return { success: true, data: JSON.parse(response.data) };
      } else {
        return { success: false, data: JSON.parse(response.data) };
      }
    });
  }
}

export default Executions;

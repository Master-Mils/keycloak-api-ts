import { Axios } from 'axios';

import AuthenticationFlow from '../../types/authentication-flow';
import ApiResponse from '../../types/api-response';

import Executions from './executions';

class Flows {
  httpClient: Axios;
  executions: Executions;

  constructor(httpClient: Axios) {
    this.httpClient = httpClient;
    this.executions = new Executions(this.httpClient);
  }

  async create(realm: string, data: AuthenticationFlow): Promise<ApiResponse<string>> {
    const url = `/${realm}/authentication/flows`;
    return await this.httpClient.post(url, JSON.stringify(data)).then((response) => {
      if (response.status === 201) {
        return { success: true, data: response.statusText };
      } else {
        return { success: false, data: response.statusText };
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

export default Flows;

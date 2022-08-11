import { Axios } from "axios";

import AuthenticationFlow from "../interfaces/authentication-flow";

import Executions from './executions'

class Flows {

  httpClient: Axios;
  executions: Executions;

  constructor(httpClient: Axios) {
    this.httpClient = httpClient;
    this.executions = new Executions(this.httpClient);
  }

  async create(realm: string, data: AuthenticationFlow): Promise<string> {
    const url = `/${realm}/authentication/flows`;
    return await this.httpClient
      .post(url, data)
      .then((response) => {
        return JSON.parse(response.data);
      });
  }

  async list(realm: string): Promise<AuthenticationFlow[]> {
    const url = `/${realm}/authentication/flows`;
    return await this.httpClient
      .get(url)
      .then((response) => {
        return JSON.parse(response.data);
      });
  }

}

export default Flows;

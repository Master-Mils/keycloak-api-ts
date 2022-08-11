import { Axios } from "axios";

import AuthenticationFlow from "../interfaces/authentication-flow";
import AuthenticationExecutionInfo from "../interfaces/authentication-execution-info";


class Executions {

  httpClient: Axios;

  constructor(httpClient: Axios) {
    this.httpClient = httpClient;
  }

  async get(realm: string, flowAlias: string): Promise<AuthenticationExecutionInfo> {
    const url = `/${realm}/authentication/flows/${flowAlias}/executions`;
    return await this.httpClient
      .get(url)
      .then((response) => {
        return JSON.parse(response.data);
      });
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

export default Executions;

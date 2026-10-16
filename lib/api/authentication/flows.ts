import { HttpClient, path } from '../http';
import AuthenticationFlow from '../../types/authentication-flow';
import ApiResponse from '../../types/api-response';

import Executions from './executions';

export default class Flows {
  readonly executions: Executions;

  constructor(private readonly http: HttpClient) {
    this.executions = new Executions(http);
  }

  /** Creates a top-level flow. On success `data` holds the new flow id. */
  create(realm: string, data: AuthenticationFlow): Promise<ApiResponse<string>> {
    return this.http.post(path`/${realm}/authentication/flows`, data);
  }

  get(realm: string, id: string): Promise<ApiResponse<AuthenticationFlow>> {
    return this.http.get(path`/${realm}/authentication/flows/${id}`);
  }

  list(realm: string): Promise<ApiResponse<AuthenticationFlow[]>> {
    return this.http.get(path`/${realm}/authentication/flows`);
  }

  update(realm: string, id: string, data: AuthenticationFlow): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/authentication/flows/${id}`, data);
  }

  delete(realm: string, id: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/authentication/flows/${id}`);
  }

  /** Copies the flow identified by `flowAlias`. On success `data` holds the new flow id. */
  copy(realm: string, flowAlias: string, newName: string): Promise<ApiResponse<string>> {
    return this.http.post(path`/${realm}/authentication/flows/${flowAlias}/copy`, { newName });
  }
}

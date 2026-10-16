import { HttpClient, path } from '../http';
import AuthenticationExecution from '../../types/authentication-execution';
import AuthenticationExecutionInfo from '../../types/authentication-execution-info';
import ApiResponse from '../../types/api-response';

export interface NewSubFlow {
  alias: string;
  /** `basic-flow` or `form-flow`. */
  type: string;
  provider?: string;
  description?: string;
}

/** Executions of an authentication flow. */
export default class Executions {
  constructor(private readonly http: HttpClient) {}

  /** Lists the executions of the flow identified by `flowAlias`. */
  list(realm: string, flowAlias: string): Promise<ApiResponse<AuthenticationExecutionInfo[]>> {
    return this.http.get(path`/${realm}/authentication/flows/${flowAlias}/executions`);
  }

  get(realm: string, executionId: string): Promise<ApiResponse<AuthenticationExecution>> {
    return this.http.get(path`/${realm}/authentication/executions/${executionId}`);
  }

  /**
   * Adds an authenticator execution to the flow. On success `data` holds the new execution id.
   *
   * @param provider authenticator provider id, e.g. `auth-cookie`
   */
  create(realm: string, flowAlias: string, provider: string): Promise<ApiResponse<string>> {
    return this.http.post(path`/${realm}/authentication/flows/${flowAlias}/executions/execution`, { provider });
  }

  /** Adds a sub-flow to the flow. On success `data` holds the new execution id. */
  createSubFlow(realm: string, flowAlias: string, data: NewSubFlow): Promise<ApiResponse<string>> {
    return this.http.post(path`/${realm}/authentication/flows/${flowAlias}/executions/flow`, data);
  }

  /** Updates an execution of the flow, e.g. its `requirement`. */
  update(realm: string, flowAlias: string, data: AuthenticationExecutionInfo): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/authentication/flows/${flowAlias}/executions`, data);
  }

  delete(realm: string, executionId: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/authentication/executions/${executionId}`);
  }
}

import { HttpClient, path } from '../http';
import Workflow from '../../types/workflow';
import ApiResponse from '../../types/api-response';

export interface WorkflowListQueryParameters {
  /** Match `search` exactly instead of as a substring. */
  exact?: boolean;
  first?: number;
  max?: number;
  search?: string;
}

/**
 * Workflows (Keycloak 26.4+, preview feature `workflows`): automated, scheduled steps on users and other resources.
 * Definitions can be sent as JSON objects or as YAML strings.
 */
export default class Workflows {
  constructor(private readonly http: HttpClient) {}

  list(realm: string, options?: WorkflowListQueryParameters): Promise<ApiResponse<Workflow[]>> {
    return this.http.get(path`/${realm}/workflows`, { ...options });
  }

  /** Creates a workflow from an object or a YAML document. On success `data` holds the new workflow id. */
  create(realm: string, data: Workflow | string): Promise<ApiResponse<string>> {
    return this.http.request('POST', path`/${realm}/workflows`, Workflows.body(data));
  }

  get(realm: string, id: string, options?: { includeId?: boolean }): Promise<ApiResponse<Workflow>> {
    return this.http.get(path`/${realm}/workflows/${id}`, { ...options });
  }

  update(realm: string, id: string, data: Workflow | string): Promise<ApiResponse<void>> {
    return this.http.request('PUT', path`/${realm}/workflows/${id}`, Workflows.body(data));
  }

  delete(realm: string, id: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/workflows/${id}`);
  }

  /** Workflows scheduled for a resource (e.g. a user id). */
  listScheduled(realm: string, resourceId: string): Promise<ApiResponse<Workflow[]>> {
    return this.http.get(path`/${realm}/workflows/scheduled/${resourceId}`);
  }

  /** Moves resources scheduled on step `from` to step `to`. */
  migrate(realm: string, options: { from: string; to: string }): Promise<ApiResponse<void>> {
    return this.http.post(path`/${realm}/workflows/migrate`, undefined, { ...options });
  }

  /**
   * Starts the workflow for a resource of `type` (e.g. `users`).
   *
   * @param options.notBefore delay before the first step, e.g. `'P1D'` or epoch milliseconds
   */
  activate(
    realm: string,
    id: string,
    type: string,
    resourceId: string,
    options?: { notBefore?: string },
  ): Promise<ApiResponse<void>> {
    return this.http.post(path`/${realm}/workflows/${id}/activate/${type}/${resourceId}`, undefined, { ...options });
  }

  deactivate(realm: string, id: string, type: string, resourceId: string): Promise<ApiResponse<void>> {
    return this.http.post(path`/${realm}/workflows/${id}/deactivate/${type}/${resourceId}`);
  }

  private static body(data: Workflow | string) {
    return typeof data === 'string' ? { data, headers: { 'Content-Type': 'application/yaml' } } : { data };
  }
}

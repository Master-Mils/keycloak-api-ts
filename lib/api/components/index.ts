import { HttpClient, path } from '../http';
import Component from '../../types/component';
import ApiResponse from '../../types/api-response';

export interface ComponentListQueryParameters {
  name?: string;
  parent?: string;
  /** Provider type, e.g. `org.keycloak.storage.UserStorageProvider`. */
  type?: string;
}

export class Components {
  constructor(private readonly http: HttpClient) {}

  list(realm: string, options?: ComponentListQueryParameters): Promise<ApiResponse<Component[]>> {
    return this.http.get(path`/${realm}/components`, { ...options });
  }

  /** Creates a component. On success `data` holds the new component id. */
  create(realm: string, component: Component): Promise<ApiResponse<string>> {
    return this.http.post(path`/${realm}/components`, component);
  }

  get(realm: string, componentId: string): Promise<ApiResponse<Component>> {
    return this.http.get(path`/${realm}/components/${componentId}`);
  }

  update(realm: string, componentId: string, component: Component): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/components/${componentId}`, component);
  }

  delete(realm: string, componentId: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/components/${componentId}`);
  }
}

export default Components;

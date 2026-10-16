import { HttpClient, path } from '../http';
import Client from '../../types/client';
import ApiResponse from '../../types/api-response';

export interface ClientListQueryParameters {
  clientId?: string;
  first?: number;
  max?: number;
  /** Search by attribute, e.g. `key1:value1 key2:value2`. */
  q?: string;
  /** When true, `clientId` is matched as a substring instead of exactly. */
  search?: boolean;
  viewableOnly?: boolean;
}

export default class Clients {
  constructor(private readonly http: HttpClient) {}

  /** Creates a client. On success `data` holds the new client id. */
  create(realm: string, data: Client): Promise<ApiResponse<string>> {
    return this.http.post(path`/${realm}/clients`, data);
  }

  get(realm: string, id: string): Promise<ApiResponse<Client>> {
    return this.http.get(path`/${realm}/clients/${id}`);
  }

  list(realm: string, options?: ClientListQueryParameters): Promise<ApiResponse<Client[]>> {
    return this.http.get(path`/${realm}/clients`, { ...options });
  }

  update(realm: string, id: string, data: Client): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/clients/${id}`, data);
  }

  delete(realm: string, id: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/clients/${id}`);
  }
}

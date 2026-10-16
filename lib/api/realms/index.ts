import { HttpClient, path } from '../http';
import Realm from '../../types/realm';
import ApiResponse from '../../types/api-response';

export default class Realms {
  constructor(private readonly http: HttpClient) {}

  /** Imports (creates) a realm from a full representation. */
  import(data: Realm): Promise<ApiResponse<string>> {
    return this.http.post('', data);
  }

  /** Lists the realms the caller can view. */
  list(options?: { briefRepresentation?: boolean }): Promise<ApiResponse<Realm[]>> {
    return this.http.get('', { ...options });
  }

  /**
   * Gets the top-level representation of the realm. It does not include nested users or clients.
   *
   * @param realm realm name (not id!)
   */
  get(realm: string): Promise<ApiResponse<Realm>> {
    return this.http.get(path`/${realm}`);
  }

  /**
   * Updates the top-level information of the realm. Users, roles or clients in the representation are ignored.
   *
   * @param realm realm name (not id!)
   */
  update(realm: string, data: Realm): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}`, data);
  }

  /** @param realm realm name (not id!) */
  delete(realm: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}`);
  }
}

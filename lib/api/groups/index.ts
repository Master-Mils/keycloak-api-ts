import { HttpClient, path } from '../http';
import Group from '../../types/group';
import User from '../../types/user';
import ApiResponse from '../../types/api-response';

export interface GroupListQueryParameters {
  briefRepresentation?: boolean;
  exact?: boolean;
  first?: number;
  max?: number;
  populateHierarchy?: boolean;
  /** Search by attribute, e.g. `key1:value1 key2:value2`. */
  q?: string;
  search?: string;
  subGroupsCount?: boolean;
}

export default class Groups {
  constructor(private readonly http: HttpClient) {}

  /** Creates a top-level group. On success `data` holds the new group id. */
  create(realm: string, data: Group): Promise<ApiResponse<string>> {
    return this.http.post(path`/${realm}/groups`, data);
  }

  /** Creates (or moves) a child group under `parentId`. On success `data` holds the child group id. */
  createChild(realm: string, parentId: string, data: Group): Promise<ApiResponse<string>> {
    return this.http.post(path`/${realm}/groups/${parentId}/children`, data);
  }

  get(realm: string, id: string): Promise<ApiResponse<Group>> {
    return this.http.get(path`/${realm}/groups/${id}`);
  }

  list(realm: string, options?: GroupListQueryParameters): Promise<ApiResponse<Group[]>> {
    return this.http.get(path`/${realm}/groups`, { ...options });
  }

  count(realm: string, options?: { search?: string; top?: boolean }): Promise<ApiResponse<{ count: number }>> {
    return this.http.get(path`/${realm}/groups/count`, { ...options });
  }

  update(realm: string, id: string, data: Group): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/groups/${id}`, data);
  }

  delete(realm: string, id: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/groups/${id}`);
  }

  listMembers(
    realm: string,
    id: string,
    options?: { briefRepresentation?: boolean; first?: number; max?: number },
  ): Promise<ApiResponse<User[]>> {
    return this.http.get(path`/${realm}/groups/${id}/members`, { ...options });
  }
}

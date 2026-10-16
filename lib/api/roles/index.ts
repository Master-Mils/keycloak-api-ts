import { HttpClient, path } from '../http';
import Role from '../../types/role';
import User from '../../types/user';
import ApiResponse from '../../types/api-response';

export interface RoleListQueryParameters {
  briefRepresentation?: boolean;
  first?: number;
  max?: number;
  search?: string;
}

/** Realm-level roles. */
export default class Roles {
  constructor(private readonly http: HttpClient) {}

  /** Creates a realm role. On success `data` holds the role name. */
  create(realm: string, data: Role): Promise<ApiResponse<string>> {
    return this.http.post(path`/${realm}/roles`, data);
  }

  get(realm: string, roleName: string): Promise<ApiResponse<Role>> {
    return this.http.get(path`/${realm}/roles/${roleName}`);
  }

  getById(realm: string, roleId: string): Promise<ApiResponse<Role>> {
    return this.http.get(path`/${realm}/roles-by-id/${roleId}`);
  }

  list(realm: string, options?: RoleListQueryParameters): Promise<ApiResponse<Role[]>> {
    return this.http.get(path`/${realm}/roles`, { ...options });
  }

  update(realm: string, roleName: string, data: Role): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/roles/${roleName}`, data);
  }

  delete(realm: string, roleName: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/roles/${roleName}`);
  }

  listUsers(realm: string, roleName: string, options?: { first?: number; max?: number }): Promise<ApiResponse<User[]>> {
    return this.http.get(path`/${realm}/roles/${roleName}/users`, { ...options });
  }
}

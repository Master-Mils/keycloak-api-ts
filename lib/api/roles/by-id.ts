import { HttpClient, path } from '../http';
import Role from '../../types/role';
import ManagementPermission from '../../types/management-permission';
import ApiResponse from '../../types/api-response';

/** Realm and client roles addressed by role id (`roles-by-id`). */
export default class RolesById {
  constructor(private readonly http: HttpClient) {}

  get(realm: string, roleId: string): Promise<ApiResponse<Role>> {
    return this.http.get(path`/${realm}/roles-by-id/${roleId}`);
  }

  update(realm: string, roleId: string, data: Role): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/roles-by-id/${roleId}`, data);
  }

  delete(realm: string, roleId: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/roles-by-id/${roleId}`);
  }

  listComposites(
    realm: string,
    roleId: string,
    options?: { first?: number; max?: number; search?: string },
  ): Promise<ApiResponse<Role[]>> {
    return this.http.get(path`/${realm}/roles-by-id/${roleId}/composites`, { ...options });
  }

  addComposites(realm: string, roleId: string, roles: Role[]): Promise<ApiResponse<void>> {
    return this.http.post(path`/${realm}/roles-by-id/${roleId}/composites`, roles);
  }

  removeComposites(realm: string, roleId: string, roles: Role[]): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/roles-by-id/${roleId}/composites`, roles);
  }

  listRealmComposites(realm: string, roleId: string): Promise<ApiResponse<Role[]>> {
    return this.http.get(path`/${realm}/roles-by-id/${roleId}/composites/realm`);
  }

  listClientComposites(realm: string, roleId: string, clientUuid: string): Promise<ApiResponse<Role[]>> {
    return this.http.get(path`/${realm}/roles-by-id/${roleId}/composites/clients/${clientUuid}`);
  }

  getManagementPermissions(realm: string, roleId: string): Promise<ApiResponse<ManagementPermission>> {
    return this.http.get(path`/${realm}/roles-by-id/${roleId}/management/permissions`);
  }

  updateManagementPermissions(
    realm: string,
    roleId: string,
    data: ManagementPermission,
  ): Promise<ApiResponse<ManagementPermission>> {
    return this.http.put(path`/${realm}/roles-by-id/${roleId}/management/permissions`, data);
  }
}

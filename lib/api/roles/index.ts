import { HttpClient, path } from '../http';
import { RoleContainer, RoleListQueryParameters, RolePageQueryParameters } from './container';
import RolesById from './by-id';
import Role from '../../types/role';
import User from '../../types/user';
import Group from '../../types/group';
import ManagementPermission from '../../types/management-permission';
import ApiResponse from '../../types/api-response';

export { RoleContainer, ClientRoles, RoleListQueryParameters, RolePageQueryParameters } from './container';
export { RolesById };

/** Realm-level roles. */
export default class Roles {
  /** Roles addressed by id, realm or client roles alike. */
  readonly byId: RolesById;
  private readonly container: RoleContainer;

  constructor(http: HttpClient) {
    this.byId = new RolesById(http);
    this.container = new RoleContainer(http, (realm) => path`/${realm}`);
  }

  /** Creates a realm role. On success `data` holds the role name. */
  create(realm: string, data: Role): Promise<ApiResponse<string>> {
    return this.container.create(realm, undefined, data);
  }

  get(realm: string, roleName: string): Promise<ApiResponse<Role>> {
    return this.container.get(realm, undefined, roleName);
  }

  getById(realm: string, roleId: string): Promise<ApiResponse<Role>> {
    return this.byId.get(realm, roleId);
  }

  list(realm: string, options?: RoleListQueryParameters): Promise<ApiResponse<Role[]>> {
    return this.container.list(realm, undefined, options);
  }

  update(realm: string, roleName: string, data: Role): Promise<ApiResponse<void>> {
    return this.container.update(realm, undefined, roleName, data);
  }

  delete(realm: string, roleName: string): Promise<ApiResponse<void>> {
    return this.container.delete(realm, undefined, roleName);
  }

  listUsers(realm: string, roleName: string, options?: RolePageQueryParameters): Promise<ApiResponse<User[]>> {
    return this.container.listUsers(realm, undefined, roleName, options);
  }

  listGroups(realm: string, roleName: string, options?: RolePageQueryParameters): Promise<ApiResponse<Group[]>> {
    return this.container.listGroups(realm, undefined, roleName, options);
  }

  listComposites(realm: string, roleName: string): Promise<ApiResponse<Role[]>> {
    return this.container.listComposites(realm, undefined, roleName);
  }

  addComposites(realm: string, roleName: string, roles: Role[]): Promise<ApiResponse<void>> {
    return this.container.addComposites(realm, undefined, roleName, roles);
  }

  removeComposites(realm: string, roleName: string, roles: Role[]): Promise<ApiResponse<void>> {
    return this.container.removeComposites(realm, undefined, roleName, roles);
  }

  listRealmComposites(realm: string, roleName: string): Promise<ApiResponse<Role[]>> {
    return this.container.listRealmComposites(realm, undefined, roleName);
  }

  listClientComposites(realm: string, roleName: string, targetClientUuid: string): Promise<ApiResponse<Role[]>> {
    return this.container.listClientComposites(realm, undefined, roleName, targetClientUuid);
  }

  getManagementPermissions(realm: string, roleName: string): Promise<ApiResponse<ManagementPermission>> {
    return this.container.getManagementPermissions(realm, undefined, roleName);
  }

  updateManagementPermissions(
    realm: string,
    roleName: string,
    data: ManagementPermission,
  ): Promise<ApiResponse<ManagementPermission>> {
    return this.container.updateManagementPermissions(realm, undefined, roleName, data);
  }
}

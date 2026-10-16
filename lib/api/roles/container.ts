import { HttpClient, path } from '../http';
import Role from '../../types/role';
import User from '../../types/user';
import Group from '../../types/group';
import ManagementPermission from '../../types/management-permission';
import ApiResponse from '../../types/api-response';

export interface RoleListQueryParameters {
  briefRepresentation?: boolean;
  first?: number;
  max?: number;
  search?: string;
}

export interface RolePageQueryParameters {
  briefRepresentation?: boolean;
  first?: number;
  max?: number;
}

/** Builds the URL of the container of the roles, e.g. `/{realm}` or `/{realm}/clients/{uuid}`. */
export type RoleOwnerPath<Owner> = (realm: string, owner: Owner) => string;

/** Endpoints shared by realm roles and client roles, parametrized by the owner of the roles. */
export class RoleContainer<Owner = void> {
  constructor(
    protected readonly http: HttpClient,
    private readonly ownerPath: RoleOwnerPath<Owner>,
  ) {}

  private base(realm: string, owner: Owner): string {
    return `${this.ownerPath(realm, owner)}/roles`;
  }

  private url(realm: string, owner: Owner, roleName: string, suffix = ''): string {
    return `${this.base(realm, owner)}/${encodeURIComponent(roleName)}${suffix}`;
  }

  /** Creates a role. On success `data` holds the role name. */
  create(realm: string, owner: Owner, data: Role): Promise<ApiResponse<string>> {
    return this.http.post(this.base(realm, owner), data);
  }

  get(realm: string, owner: Owner, roleName: string): Promise<ApiResponse<Role>> {
    return this.http.get(this.url(realm, owner, roleName));
  }

  list(realm: string, owner: Owner, options?: RoleListQueryParameters): Promise<ApiResponse<Role[]>> {
    return this.http.get(this.base(realm, owner), { ...options });
  }

  update(realm: string, owner: Owner, roleName: string, data: Role): Promise<ApiResponse<void>> {
    return this.http.put(this.url(realm, owner, roleName), data);
  }

  delete(realm: string, owner: Owner, roleName: string): Promise<ApiResponse<void>> {
    return this.http.delete(this.url(realm, owner, roleName));
  }

  listUsers(
    realm: string,
    owner: Owner,
    roleName: string,
    options?: RolePageQueryParameters,
  ): Promise<ApiResponse<User[]>> {
    return this.http.get(this.url(realm, owner, roleName, '/users'), { ...options });
  }

  listGroups(
    realm: string,
    owner: Owner,
    roleName: string,
    options?: RolePageQueryParameters,
  ): Promise<ApiResponse<Group[]>> {
    return this.http.get(this.url(realm, owner, roleName, '/groups'), { ...options });
  }

  listComposites(realm: string, owner: Owner, roleName: string): Promise<ApiResponse<Role[]>> {
    return this.http.get(this.url(realm, owner, roleName, '/composites'));
  }

  /** Makes the role a composite by adding child roles. */
  addComposites(realm: string, owner: Owner, roleName: string, roles: Role[]): Promise<ApiResponse<void>> {
    return this.http.post(this.url(realm, owner, roleName, '/composites'), roles);
  }

  removeComposites(realm: string, owner: Owner, roleName: string, roles: Role[]): Promise<ApiResponse<void>> {
    return this.http.delete(this.url(realm, owner, roleName, '/composites'), roles);
  }

  listRealmComposites(realm: string, owner: Owner, roleName: string): Promise<ApiResponse<Role[]>> {
    return this.http.get(this.url(realm, owner, roleName, '/composites/realm'));
  }

  /** Composite roles that belong to the client `targetClientUuid`. */
  listClientComposites(
    realm: string,
    owner: Owner,
    roleName: string,
    targetClientUuid: string,
  ): Promise<ApiResponse<Role[]>> {
    return this.http.get(this.url(realm, owner, roleName, path`/composites/clients/${targetClientUuid}`));
  }

  getManagementPermissions(realm: string, owner: Owner, roleName: string): Promise<ApiResponse<ManagementPermission>> {
    return this.http.get(this.url(realm, owner, roleName, '/management/permissions'));
  }

  updateManagementPermissions(
    realm: string,
    owner: Owner,
    roleName: string,
    data: ManagementPermission,
  ): Promise<ApiResponse<ManagementPermission>> {
    return this.http.put(this.url(realm, owner, roleName, '/management/permissions'), data);
  }
}

/** Client roles; `clientUuid` is the internal id of the client, not its `clientId`. */
export class ClientRoles extends RoleContainer<string> {
  constructor(http: HttpClient) {
    super(http, (realm, clientUuid) => path`/${realm}/clients/${clientUuid}`);
  }
}

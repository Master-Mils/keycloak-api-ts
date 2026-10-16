import { HttpClient, path } from '../http';
import { RoleMappings } from '../role-mappings';
import User from '../../types/user';
import Role from '../../types/role';
import Group from '../../types/group';
import Mappings from '../../types/mappings';
import UserProfileConfig from '../../types/user-profile';
import ApiResponse from '../../types/api-response';

export interface UserListQueryParameters {
  briefRepresentation?: boolean;
  email?: string;
  emailVerified?: boolean;
  enabled?: boolean;
  /** Exact match for `username`, `email`, `firstName` and `lastName`. */
  exact?: boolean;
  first?: number;
  firstName?: string;
  idpAlias?: string;
  idpUserId?: string;
  lastName?: string;
  max?: number;
  /** Search by attribute, e.g. `key1:value1 key2:value2`. */
  q?: string;
  search?: string;
  username?: string;
}

export interface UserCountQueryParameters {
  email?: string;
  emailVerified?: boolean;
  enabled?: boolean;
  firstName?: string;
  lastName?: string;
  q?: string;
  search?: string;
  username?: string;
}

export default class Users {
  /** Realm and client role mappings of a user. */
  readonly roleMappings: RoleMappings;

  constructor(private readonly http: HttpClient) {
    this.roleMappings = new RoleMappings(http, (realm, id) => path`/${realm}/users/${id}`);
  }

  /** Creates a user. On success `data` holds the new user id. */
  create(realm: string, data: User): Promise<ApiResponse<string>> {
    return this.http.post(path`/${realm}/users`, data);
  }

  /** @param options.userProfileMetadata include the user profile metadata in the response */
  get(realm: string, id: string, options?: { userProfileMetadata?: boolean }): Promise<ApiResponse<User>> {
    return this.http.get(path`/${realm}/users/${id}`, { ...options });
  }

  count(realm: string, options?: UserCountQueryParameters): Promise<ApiResponse<number>> {
    return this.http.get(path`/${realm}/users/count`, { ...options });
  }

  list(realm: string, options?: UserListQueryParameters): Promise<ApiResponse<User[]>> {
    return this.http.get(path`/${realm}/users`, { ...options });
  }

  /**
   * Updates a user. Since Keycloak 24 the user profile is always enabled: attributes not declared in the
   * profile are dropped unless the realm allows unmanaged attributes.
   */
  update(realm: string, id: string, data: User): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/users/${id}`, data);
  }

  delete(realm: string, id: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/users/${id}`);
  }

  /** Realm and client role mappings of the user. */
  getRoleMappings(realm: string, id: string): Promise<ApiResponse<Mappings>> {
    return this.http.get(path`/${realm}/users/${id}/role-mappings`);
  }

  listRealmRoleMappings(realm: string, id: string): Promise<ApiResponse<Role[]>> {
    return this.http.get(path`/${realm}/users/${id}/role-mappings/realm`);
  }

  /** Realm roles assigned to the user, including those inherited through composites. */
  listCompositeRealmRoleMappings(realm: string, id: string): Promise<ApiResponse<Role[]>> {
    return this.http.get(path`/${realm}/users/${id}/role-mappings/realm/composite`);
  }

  addRealmRoleMapping(realm: string, id: string, data: Role[]): Promise<ApiResponse<void>> {
    return this.http.post(path`/${realm}/users/${id}/role-mappings/realm`, data);
  }

  deleteRealmRoleMapping(realm: string, id: string, data: Role[]): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/users/${id}/role-mappings/realm`, data);
  }

  listGroups(
    realm: string,
    id: string,
    options?: { briefRepresentation?: boolean; first?: number; max?: number; search?: string },
  ): Promise<ApiResponse<Group[]>> {
    return this.http.get(path`/${realm}/users/${id}/groups`, { ...options });
  }

  addToGroup(realm: string, id: string, groupId: string): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/users/${id}/groups/${groupId}`);
  }

  removeFromGroup(realm: string, id: string, groupId: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/users/${id}/groups/${groupId}`);
  }

  /** Gets the realm user profile configuration (attributes, groups, unmanaged attribute policy). */
  getProfile(realm: string): Promise<ApiResponse<UserProfileConfig>> {
    return this.http.get(path`/${realm}/users/profile`);
  }

  /** Replaces the realm user profile configuration. On success `data` holds the stored configuration. */
  updateProfile(realm: string, config: UserProfileConfig): Promise<ApiResponse<UserProfileConfig>> {
    return this.http.put(path`/${realm}/users/profile`, config);
  }
}

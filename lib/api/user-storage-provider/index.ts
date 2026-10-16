import { HttpClient, path } from '../http';
import Component from '../../types/component';
import ApiResponse from '../../types/api-response';

export type ActionType = 'triggerFullSync' | 'triggerChangedUsersSync';
export type DirectionType = 'fedToKeycloak' | 'keycloakToFed';

export interface SynchronizationResult {
  ignored?: boolean;
  added?: number;
  updated?: number;
  removed?: number;
  failed?: number;
  status?: string;
}

export const USER_STORAGE_PROVIDER_TYPE = 'org.keycloak.storage.UserStorageProvider';
export const LDAP_STORAGE_MAPPER_TYPE = 'org.keycloak.storage.ldap.mappers.LDAPStorageMapper';

export class UserStorageProvider {
  constructor(private readonly http: HttpClient) {}

  /** Lists the user storage providers (user federation) of the realm. */
  list(realm: string): Promise<ApiResponse<Component[]>> {
    return this.http.get(path`/${realm}/components`, { type: USER_STORAGE_PROVIDER_TYPE });
  }

  /** Gets the display name of a user storage provider. */
  getName(realm: string, storageId: string): Promise<ApiResponse<{ id: string; name: string }>> {
    return this.http.get(path`/${realm}/user-storage/${storageId}/name`);
  }

  removeImportedUsers(realm: string, storageId: string): Promise<ApiResponse<void>> {
    return this.http.post(path`/${realm}/user-storage/${storageId}/remove-imported-users`);
  }

  syncUsers(realm: string, storageId: string, action?: ActionType): Promise<ApiResponse<SynchronizationResult>> {
    return this.http.post(path`/${realm}/user-storage/${storageId}/sync`, undefined, { action });
  }

  unlinkUsers(realm: string, storageId: string): Promise<ApiResponse<void>> {
    return this.http.post(path`/${realm}/user-storage/${storageId}/unlink-users`);
  }

  /**
   * Triggers a sync for a single storage mapper.
   *
   * @param mapperId id of the mapper component
   * @param parentId id of the user storage provider that owns the mapper
   */
  mappersSync(
    realm: string,
    mapperId: string,
    parentId: string,
    direction?: DirectionType,
  ): Promise<ApiResponse<SynchronizationResult>> {
    return this.http.post(path`/${realm}/user-storage/${parentId}/mappers/${mapperId}/sync`, undefined, {
      direction,
    });
  }

  /** Lists the mappers of a user storage provider. */
  listMappers(realm: string, storageId: string): Promise<ApiResponse<Component[]>> {
    return this.http.get(path`/${realm}/components`, { parent: storageId, type: LDAP_STORAGE_MAPPER_TYPE });
  }
}

export default UserStorageProvider;

import { HttpClient, path } from '../http';
import { RoleMappings } from '../role-mappings';
import User from '../../types/user';
import Role from '../../types/role';
import Group from '../../types/group';
import Mappings from '../../types/mappings';
import UserProfileConfig from '../../types/user-profile';
import ApiResponse from '../../types/api-response';
import Credential from '../../types/credential';
import FederatedIdentity from '../../types/federated-identity';
import UserSession from '../../types/user-session';
import UserProfileMetadata from '../../types/user-profile-metadata';

export interface ActionEmailOptions {
  /** Client the link redirects back to. */
  clientId?: string;
  /** Link validity in seconds. */
  lifespan?: number;
  /** Must be a valid redirect URI of the client. */
  redirectUri?: string;
}

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

  /** Gets the user profile metadata (attribute definitions as seen by the current context). */
  getProfileMetadata(realm: string): Promise<ApiResponse<UserProfileMetadata>> {
    return this.http.get(path`/${realm}/users/profile/metadata`);
  }

  /** Credential types provided by the user storage where the user is stored. */
  listConfiguredUserStorageCredentialTypes(realm: string, id: string): Promise<ApiResponse<string[]>> {
    return this.http.get(path`/${realm}/users/${id}/configured-user-storage-credential-types`);
  }

  /** Consents granted by the user. The representation is a free-form object. */
  listConsents(realm: string, id: string): Promise<ApiResponse<Record<string, unknown>[]>> {
    return this.http.get(path`/${realm}/users/${id}/consents`);
  }

  /** Revokes the consent and offline tokens of a client for the user. */
  revokeConsent(realm: string, id: string, client: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/users/${id}/consents/${client}`);
  }

  listCredentials(realm: string, id: string): Promise<ApiResponse<Credential[]>> {
    return this.http.get(path`/${realm}/users/${id}/credentials`);
  }

  deleteCredential(realm: string, id: string, credentialId: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/users/${id}/credentials/${credentialId}`);
  }

  /** Moves a credential to the position right behind another credential. */
  moveCredentialAfter(
    realm: string,
    id: string,
    credentialId: string,
    newPreviousCredentialId: string,
  ): Promise<ApiResponse<void>> {
    return this.http.post(path`/${realm}/users/${id}/credentials/${credentialId}/moveAfter/${newPreviousCredentialId}`);
  }

  moveCredentialToFirst(realm: string, id: string, credentialId: string): Promise<ApiResponse<void>> {
    return this.http.post(path`/${realm}/users/${id}/credentials/${credentialId}/moveToFirst`);
  }

  /** Updates the label of a credential (sent as `text/plain`). */
  updateCredentialUserLabel(
    realm: string,
    id: string,
    credentialId: string,
    label: string,
  ): Promise<ApiResponse<void>> {
    return this.http.request('PUT', path`/${realm}/users/${id}/credentials/${credentialId}/userLabel`, {
      data: label,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  /** Disables all credentials of the given types (e.g. `password`, `otp`). */
  disableCredentialTypes(realm: string, id: string, types: string[]): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/users/${id}/disable-credential-types`, types);
  }

  /** Sends an email with a link to execute the given required actions (e.g. `UPDATE_PASSWORD`). */
  executeActionsEmail(
    realm: string,
    id: string,
    actions: string[],
    options?: ActionEmailOptions,
  ): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/users/${id}/execute-actions-email`, actions, {
      client_id: options?.clientId,
      lifespan: options?.lifespan,
      redirect_uri: options?.redirectUri,
    });
  }

  listFederatedIdentities(realm: string, id: string): Promise<ApiResponse<FederatedIdentity[]>> {
    return this.http.get(path`/${realm}/users/${id}/federated-identity`);
  }

  /** Links an identity provider account to the user. */
  addFederatedIdentity(
    realm: string,
    id: string,
    provider: string,
    data: FederatedIdentity,
  ): Promise<ApiResponse<void>> {
    return this.http.post(path`/${realm}/users/${id}/federated-identity/${provider}`, data);
  }

  removeFederatedIdentity(realm: string, id: string, provider: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/users/${id}/federated-identity/${provider}`);
  }

  /** Number of groups of the user; `data` is `{ count }`. */
  countGroups(realm: string, id: string, options?: { search?: string }): Promise<ApiResponse<{ count: number }>> {
    return this.http.get(path`/${realm}/users/${id}/groups/count`, { ...options });
  }

  /** Impersonates the user. `data` holds e.g. `sameRealm` and `redirect`. */
  impersonate(realm: string, id: string): Promise<ApiResponse<Record<string, unknown>>> {
    return this.http.post(path`/${realm}/users/${id}/impersonation`);
  }

  /** Removes all sessions of the user. */
  logout(realm: string, id: string): Promise<ApiResponse<void>> {
    return this.http.post(path`/${realm}/users/${id}/logout`);
  }

  listOfflineSessions(realm: string, id: string, clientUuid: string): Promise<ApiResponse<UserSession[]>> {
    return this.http.get(path`/${realm}/users/${id}/offline-sessions/${clientUuid}`);
  }

  /** Sets a new password (or other credential) for the user. */
  resetPassword(realm: string, id: string, credential: Credential): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/users/${id}/reset-password`, credential);
  }

  resetPasswordEmail(
    realm: string,
    id: string,
    options?: Pick<ActionEmailOptions, 'clientId' | 'redirectUri'>,
  ): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/users/${id}/reset-password-email`, undefined, {
      client_id: options?.clientId,
      redirect_uri: options?.redirectUri,
    });
  }

  sendVerifyEmail(realm: string, id: string, options?: ActionEmailOptions): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/users/${id}/send-verify-email`, undefined, {
      client_id: options?.clientId,
      lifespan: options?.lifespan,
      redirect_uri: options?.redirectUri,
    });
  }

  listSessions(realm: string, id: string): Promise<ApiResponse<UserSession[]>> {
    return this.http.get(path`/${realm}/users/${id}/sessions`);
  }

  /** Attributes of the user not declared in the user profile. */
  getUnmanagedAttributes(realm: string, id: string): Promise<ApiResponse<Record<string, string[]>>> {
    return this.http.get(path`/${realm}/users/${id}/unmanagedAttributes`);
  }
}

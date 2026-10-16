import { HttpClient, path } from './http';
import Role from '../types/role';
import Mappings from '../types/mappings';
import ApiResponse from '../types/api-response';

/** Builds the URL of the resource that owns the mappings, e.g. `/{realm}/users/{id}`. */
export type MappingOwnerPath<Owner> = (realm: string, owner: Owner) => string;

/**
 * Realm and client role mappings of a user, a group or an organization group.
 *
 * `owner` is the user or group id (or `{ organizationId, groupId }` for organization groups) and `clientId` is the
 * internal id of the client that holds the roles, not its `clientId`.
 */
export class RoleMappings<Owner = string> {
  constructor(
    private readonly http: HttpClient,
    private readonly ownerPath: MappingOwnerPath<Owner>,
  ) {}

  private url(realm: string, owner: Owner, suffix: string): string {
    return `${this.ownerPath(realm, owner)}/role-mappings${suffix}`;
  }

  /** All realm and client role mappings. */
  get(realm: string, owner: Owner): Promise<ApiResponse<Mappings>> {
    return this.http.get(this.url(realm, owner, ''));
  }

  listRealm(realm: string, owner: Owner): Promise<ApiResponse<Role[]>> {
    return this.http.get(this.url(realm, owner, '/realm'));
  }

  addRealm(realm: string, owner: Owner, roles: Role[]): Promise<ApiResponse<void>> {
    return this.http.post(this.url(realm, owner, '/realm'), roles);
  }

  removeRealm(realm: string, owner: Owner, roles: Role[]): Promise<ApiResponse<void>> {
    return this.http.delete(this.url(realm, owner, '/realm'), roles);
  }

  /** Realm roles that can still be mapped. */
  listAvailableRealm(realm: string, owner: Owner): Promise<ApiResponse<Role[]>> {
    return this.http.get(this.url(realm, owner, '/realm/available'));
  }

  /** Effective realm roles, including those inherited through composites. */
  listCompositeRealm(
    realm: string,
    owner: Owner,
    options?: { briefRepresentation?: boolean },
  ): Promise<ApiResponse<Role[]>> {
    return this.http.get(this.url(realm, owner, '/realm/composite'), { ...options });
  }

  listClient(realm: string, owner: Owner, clientId: string): Promise<ApiResponse<Role[]>> {
    return this.http.get(this.url(realm, owner, path`/clients/${clientId}`));
  }

  addClient(realm: string, owner: Owner, clientId: string, roles: Role[]): Promise<ApiResponse<void>> {
    return this.http.post(this.url(realm, owner, path`/clients/${clientId}`), roles);
  }

  removeClient(realm: string, owner: Owner, clientId: string, roles: Role[]): Promise<ApiResponse<void>> {
    return this.http.delete(this.url(realm, owner, path`/clients/${clientId}`), roles);
  }

  /** Client roles that can still be mapped. */
  listAvailableClient(realm: string, owner: Owner, clientId: string): Promise<ApiResponse<Role[]>> {
    return this.http.get(this.url(realm, owner, path`/clients/${clientId}/available`));
  }

  /** Effective client roles, including those inherited through composites. */
  listCompositeClient(
    realm: string,
    owner: Owner,
    clientId: string,
    options?: { briefRepresentation?: boolean },
  ): Promise<ApiResponse<Role[]>> {
    return this.http.get(this.url(realm, owner, path`/clients/${clientId}/composite`), { ...options });
  }
}

/**
 * Scope mappings of a client or a client scope: the roles that may be placed in tokens issued through it.
 *
 * `owner` is the client or client scope id and `clientId` is the internal id of the client that holds the roles.
 */
export class ScopeMappings {
  constructor(
    private readonly http: HttpClient,
    private readonly ownerPath: MappingOwnerPath<string>,
  ) {}

  private url(realm: string, owner: string, suffix: string): string {
    return `${this.ownerPath(realm, owner)}/scope-mappings${suffix}`;
  }

  /** All realm and client scope mappings. */
  get(realm: string, owner: string): Promise<ApiResponse<Mappings>> {
    return this.http.get(this.url(realm, owner, ''));
  }

  listRealm(realm: string, owner: string): Promise<ApiResponse<Role[]>> {
    return this.http.get(this.url(realm, owner, '/realm'));
  }

  addRealm(realm: string, owner: string, roles: Role[]): Promise<ApiResponse<void>> {
    return this.http.post(this.url(realm, owner, '/realm'), roles);
  }

  removeRealm(realm: string, owner: string, roles: Role[]): Promise<ApiResponse<void>> {
    return this.http.delete(this.url(realm, owner, '/realm'), roles);
  }

  listAvailableRealm(realm: string, owner: string): Promise<ApiResponse<Role[]>> {
    return this.http.get(this.url(realm, owner, '/realm/available'));
  }

  listCompositeRealm(
    realm: string,
    owner: string,
    options?: { briefRepresentation?: boolean },
  ): Promise<ApiResponse<Role[]>> {
    return this.http.get(this.url(realm, owner, '/realm/composite'), { ...options });
  }

  listClient(realm: string, owner: string, clientId: string): Promise<ApiResponse<Role[]>> {
    return this.http.get(this.url(realm, owner, path`/clients/${clientId}`));
  }

  addClient(realm: string, owner: string, clientId: string, roles: Role[]): Promise<ApiResponse<void>> {
    return this.http.post(this.url(realm, owner, path`/clients/${clientId}`), roles);
  }

  removeClient(realm: string, owner: string, clientId: string, roles: Role[]): Promise<ApiResponse<void>> {
    return this.http.delete(this.url(realm, owner, path`/clients/${clientId}`), roles);
  }

  listAvailableClient(realm: string, owner: string, clientId: string): Promise<ApiResponse<Role[]>> {
    return this.http.get(this.url(realm, owner, path`/clients/${clientId}/available`));
  }

  listCompositeClient(
    realm: string,
    owner: string,
    clientId: string,
    options?: { briefRepresentation?: boolean },
  ): Promise<ApiResponse<Role[]>> {
    return this.http.get(this.url(realm, owner, path`/clients/${clientId}/composite`), { ...options });
  }
}

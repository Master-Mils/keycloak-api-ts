import { HttpClient, path } from '../http';
import { ScopeMappings } from '../role-mappings';
import ProtocolMappers from '../protocol-mappers';
import { ClientScopeKind } from '../clients';
import ClientScope from '../../types/client-scope';
import ApiResponse from '../../types/api-response';

/** CRUD, scope mappings and protocol mappers of client scopes, under `/client-scopes` or the legacy `/client-templates`. */
export class ClientScopeResource {
  /** Scope mappings of a client scope (the roles it allows in tokens). */
  readonly scopeMappings: ScopeMappings;
  /** Protocol mappers of a client scope. */
  readonly protocolMappers: ProtocolMappers;

  constructor(
    protected readonly http: HttpClient,
    private readonly collection: 'client-scopes' | 'client-templates',
  ) {
    const owner = (realm: string, id: string) => this.base(realm) + path`/${id}`;
    this.scopeMappings = new ScopeMappings(http, owner);
    this.protocolMappers = new ProtocolMappers(http, owner);
  }

  private base(realm: string): string {
    return path`/${realm}/` + this.collection;
  }

  /** Creates a client scope. On success `data` holds the new client scope id. */
  create(realm: string, data: ClientScope): Promise<ApiResponse<string>> {
    return this.http.post(this.base(realm), data);
  }

  get(realm: string, id: string): Promise<ApiResponse<ClientScope>> {
    return this.http.get(this.base(realm) + path`/${id}`);
  }

  list(realm: string): Promise<ApiResponse<ClientScope[]>> {
    return this.http.get(this.base(realm));
  }

  update(realm: string, id: string, data: ClientScope): Promise<ApiResponse<void>> {
    return this.http.put(this.base(realm) + path`/${id}`, data);
  }

  delete(realm: string, id: string): Promise<ApiResponse<void>> {
    return this.http.delete(this.base(realm) + path`/${id}`);
  }
}

export default class ClientScopes extends ClientScopeResource {
  /**
   * The same client scopes through the legacy `/client-templates` path, kept by Keycloak for old clients.
   *
   * @deprecated use the members of `clientScopes` directly.
   */
  readonly templates: ClientScopeResource;

  constructor(http: HttpClient) {
    super(http, 'client-scopes');
    this.templates = new ClientScopeResource(http, 'client-templates');
  }

  /** Client scopes that the realm links to new clients, as default or optional scopes. */
  listRealmDefaults(realm: string, kind: ClientScopeKind): Promise<ApiResponse<ClientScope[]>> {
    return this.http.get(path`/${realm}/` + `default-${kind}-client-scopes`);
  }

  addRealmDefault(realm: string, kind: ClientScopeKind, clientScopeId: string): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/` + `default-${kind}-client-scopes` + path`/${clientScopeId}`);
  }

  removeRealmDefault(realm: string, kind: ClientScopeKind, clientScopeId: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/` + `default-${kind}-client-scopes` + path`/${clientScopeId}`);
  }
}

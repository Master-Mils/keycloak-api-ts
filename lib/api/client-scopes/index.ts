import { HttpClient, path } from '../http';
import { ScopeMappings } from '../role-mappings';
import ProtocolMappers from '../protocol-mappers';
import { ClientScopeKind } from '../clients';
import ClientScope from '../../types/client-scope';
import ApiResponse from '../../types/api-response';

export default class ClientScopes {
  /** Scope mappings of a client scope (the roles it allows in tokens). */
  readonly scopeMappings: ScopeMappings;
  /** Protocol mappers of a client scope. */
  readonly protocolMappers: ProtocolMappers;

  constructor(private readonly http: HttpClient) {
    const owner = (realm: string, id: string) => path`/${realm}/client-scopes/${id}`;
    this.scopeMappings = new ScopeMappings(http, owner);
    this.protocolMappers = new ProtocolMappers(http, owner);
  }

  /** Creates a client scope. On success `data` holds the new client scope id. */
  create(realm: string, data: ClientScope): Promise<ApiResponse<string>> {
    return this.http.post(path`/${realm}/client-scopes`, data);
  }

  get(realm: string, id: string): Promise<ApiResponse<ClientScope>> {
    return this.http.get(path`/${realm}/client-scopes/${id}`);
  }

  list(realm: string): Promise<ApiResponse<ClientScope[]>> {
    return this.http.get(path`/${realm}/client-scopes`);
  }

  update(realm: string, id: string, data: ClientScope): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/client-scopes/${id}`, data);
  }

  delete(realm: string, id: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/client-scopes/${id}`);
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

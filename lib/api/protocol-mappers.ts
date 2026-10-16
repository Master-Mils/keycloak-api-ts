import { HttpClient, path } from './http';
import { MappingOwnerPath } from './role-mappings';
import ProtocolMapper from '../types/protocol-mapper';
import ApiResponse from '../types/api-response';

/** Protocol mappers of a client or a client scope. `owner` is the client or client scope id. */
export default class ProtocolMappers {
  constructor(
    private readonly http: HttpClient,
    private readonly ownerPath: MappingOwnerPath<string>,
  ) {}

  private url(realm: string, owner: string, suffix: string): string {
    return `${this.ownerPath(realm, owner)}/protocol-mappers${suffix}`;
  }

  list(realm: string, owner: string): Promise<ApiResponse<ProtocolMapper[]>> {
    return this.http.get(this.url(realm, owner, '/models'));
  }

  /** Mappers of one protocol (`openid-connect`, `saml`...). */
  listByProtocol(realm: string, owner: string, protocol: string): Promise<ApiResponse<ProtocolMapper[]>> {
    return this.http.get(this.url(realm, owner, path`/protocol/${protocol}`));
  }

  get(realm: string, owner: string, id: string): Promise<ApiResponse<ProtocolMapper>> {
    return this.http.get(this.url(realm, owner, path`/models/${id}`));
  }

  /** Creates a mapper. On success `data` holds the new mapper id. */
  create(realm: string, owner: string, mapper: ProtocolMapper): Promise<ApiResponse<string>> {
    return this.http.post(this.url(realm, owner, '/models'), mapper);
  }

  /** Creates several mappers at once. */
  createMany(realm: string, owner: string, mappers: ProtocolMapper[]): Promise<ApiResponse<void>> {
    return this.http.post(this.url(realm, owner, '/add-models'), mappers);
  }

  /** Replaces a mapper. The body must include its `id`. */
  update(realm: string, owner: string, id: string, mapper: ProtocolMapper): Promise<ApiResponse<void>> {
    return this.http.put(this.url(realm, owner, path`/models/${id}`), mapper);
  }

  delete(realm: string, owner: string, id: string): Promise<ApiResponse<void>> {
    return this.http.delete(this.url(realm, owner, path`/models/${id}`));
  }
}

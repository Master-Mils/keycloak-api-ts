import { HttpClient, path } from '../http';
import ClientInitialAccess from '../../types/client-initial-access';
import ClientInitialAccessCreate from '../../types/client-initial-access-create';
import ComponentType from '../../types/component-type';
import ApiResponse from '../../types/api-response';

/** Client registration service: initial access tokens and registration policy providers. */
export default class ClientRegistration {
  constructor(private readonly http: HttpClient) {}

  listInitialAccess(realm: string): Promise<ApiResponse<ClientInitialAccess[]>> {
    return this.http.get(path`/${realm}/clients-initial-access`);
  }

  /** Creates an initial access token. On success `data.token` holds the token, which is shown only once. */
  createInitialAccess(realm: string, data: ClientInitialAccessCreate): Promise<ApiResponse<ClientInitialAccess>> {
    return this.http.request('POST', path`/${realm}/clients-initial-access`, { data, keepBody: true });
  }

  deleteInitialAccess(realm: string, id: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/clients-initial-access/${id}`);
  }

  /**
   * Registration policy providers with their config properties. Policies themselves are components of type
   * `org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy` (see `components`).
   */
  listPolicyProviders(realm: string): Promise<ApiResponse<ComponentType[]>> {
    return this.http.get(path`/${realm}/client-registration-policy/providers`);
  }
}

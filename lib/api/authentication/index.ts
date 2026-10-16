import { HttpClient, path } from '../http';
import AuthenticatorConfig from '../../types/authentication-config';
import AuthenticatorConfigInfo from '../../types/authenticator-config-info';
import ConfigProperty from '../../types/config-property';
import ApiResponse from '../../types/api-response';

import Flows from './flows';
import RequiredActions from './required-actions';

type ProviderInfo = Array<Record<string, unknown>>;

export default class Authentication {
  readonly flows: Flows;
  readonly requiredActions: RequiredActions;

  constructor(private readonly http: HttpClient) {
    this.flows = new Flows(http);
    this.requiredActions = new RequiredActions(http);
  }

  listAuthenticatorProviders(realm: string): Promise<ApiResponse<ProviderInfo>> {
    return this.http.get(path`/${realm}/authentication/authenticator-providers`);
  }

  listClientAuthenticatorProviders(realm: string): Promise<ApiResponse<ProviderInfo>> {
    return this.http.get(path`/${realm}/authentication/client-authenticator-providers`);
  }

  listFormActionProviders(realm: string): Promise<ApiResponse<ProviderInfo>> {
    return this.http.get(path`/${realm}/authentication/form-action-providers`);
  }

  listFormProviders(realm: string): Promise<ApiResponse<ProviderInfo>> {
    return this.http.get(path`/${realm}/authentication/form-providers`);
  }

  /** Configuration descriptions of all client authenticators, keyed by provider id. */
  getPerClientConfigDescription(realm: string): Promise<ApiResponse<Record<string, ConfigProperty[]>>> {
    return this.http.get(path`/${realm}/authentication/per-client-config-description`);
  }

  getConfigDescription(realm: string, providerId: string): Promise<ApiResponse<AuthenticatorConfigInfo>> {
    return this.http.get(path`/${realm}/authentication/config-description/${providerId}`);
  }

  /** Creates an authenticator config. On success `data` holds the new config id. */
  createConfig(realm: string, data: AuthenticatorConfig): Promise<ApiResponse<string>> {
    return this.http.post(path`/${realm}/authentication/config`, data);
  }

  getConfig(realm: string, id: string): Promise<ApiResponse<AuthenticatorConfig>> {
    return this.http.get(path`/${realm}/authentication/config/${id}`);
  }

  updateConfig(realm: string, id: string, data: AuthenticatorConfig): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/authentication/config/${id}`, data);
  }

  deleteConfig(realm: string, id: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/authentication/config/${id}`);
  }
}

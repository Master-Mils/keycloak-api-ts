import { HttpClient, path } from '../http';
import IdentityProvider from '../../types/identity-provider';
import IdentityProviderMapper from '../../types/identity-provider-mapper';
import IdentityProviderMapperType from '../../types/identity-provider-mapper-type';
import ManagementPermission from '../../types/management-permission';
import Certificate from '../../types/certificate';
import ApiResponse from '../../types/api-response';
import { CertificateUpload, certificateForm } from '../clients';

export interface IdentityProviderListQueryParameters {
  briefRepresentation?: boolean;
  /** Only providers with a capability, e.g. `USER_LINKING` (26.5+). */
  capability?: string;
  first?: number;
  max?: number;
  /** Exclude providers linked to organizations. */
  realmOnly?: boolean;
  /** Filter by alias; prefix match by default, `*foo*` for infix and `"foo"` for exact. */
  search?: string;
  /** Provider type, e.g. `oidc` or `saml` (26.5+). */
  type?: string;
}

/** Identity brokering: identity providers and their mappers. Providers are addressed by `alias`. */
export default class IdentityProviders {
  constructor(private readonly http: HttpClient) {}

  /** Creates an identity provider. On success `data` holds its alias. */
  create(realm: string, data: IdentityProvider): Promise<ApiResponse<string>> {
    return this.http.post(path`/${realm}/identity-provider/instances`, data);
  }

  get(realm: string, alias: string): Promise<ApiResponse<IdentityProvider>> {
    return this.http.get(path`/${realm}/identity-provider/instances/${alias}`);
  }

  list(realm: string, options?: IdentityProviderListQueryParameters): Promise<ApiResponse<IdentityProvider[]>> {
    return this.http.get(path`/${realm}/identity-provider/instances`, { ...options });
  }

  update(realm: string, alias: string, data: IdentityProvider): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/identity-provider/instances/${alias}`, data);
  }

  delete(realm: string, alias: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/identity-provider/instances/${alias}`);
  }

  /**
   * Reads the configuration of a provider from a discovery document or SAML descriptor, e.g.
   * `{ providerId: 'oidc', fromUrl: 'https://idp.example.com/.well-known/openid-configuration' }`.
   * On success `data` holds the config map to use in `IdentityProvider.config`.
   */
  importConfig(realm: string, data: Record<string, unknown>): Promise<ApiResponse<Record<string, string>>> {
    return this.http.post(path`/${realm}/identity-provider/import-config`, data);
  }

  /**
   * Uploads a certificate (multipart) and returns it with the derived public key or JWKS, ready for the provider
   * config (26+).
   */
  uploadCertificate(realm: string, upload: CertificateUpload): Promise<ApiResponse<Certificate>> {
    return this.http.request('POST', path`/${realm}/identity-provider/upload-certificate`, {
      data: certificateForm(upload),
    });
  }

  /** Exports the provider's public broker configuration (for SAML, the SP descriptor XML). */
  export<T = unknown>(realm: string, alias: string, options?: { format?: string }): Promise<ApiResponse<T>> {
    return this.http.get(path`/${realm}/identity-provider/instances/${alias}/export`, { ...options });
  }

  /** Refreshes the cached keys of the provider. `data` tells whether keys were reloaded. */
  reloadKeys(realm: string, alias: string): Promise<ApiResponse<boolean>> {
    return this.http.get(path`/${realm}/identity-provider/instances/${alias}/reload-keys`);
  }

  /** Describes a provider type (`oidc`, `saml`, `google`...), including its config properties. */
  getProviderType<T = Record<string, unknown>>(realm: string, providerId: string): Promise<ApiResponse<T>> {
    return this.http.get(path`/${realm}/identity-provider/providers/${providerId}`);
  }

  getManagementPermissions(realm: string, alias: string): Promise<ApiResponse<ManagementPermission>> {
    return this.http.get(path`/${realm}/identity-provider/instances/${alias}/management/permissions`);
  }

  updateManagementPermissions(
    realm: string,
    alias: string,
    data: ManagementPermission,
  ): Promise<ApiResponse<ManagementPermission>> {
    return this.http.put(path`/${realm}/identity-provider/instances/${alias}/management/permissions`, data);
  }

  // Mappers

  /** Mapper types available for the provider, keyed by mapper id. */
  listMapperTypes(realm: string, alias: string): Promise<ApiResponse<Record<string, IdentityProviderMapperType>>> {
    return this.http.get(path`/${realm}/identity-provider/instances/${alias}/mapper-types`);
  }

  listMappers(realm: string, alias: string): Promise<ApiResponse<IdentityProviderMapper[]>> {
    return this.http.get(path`/${realm}/identity-provider/instances/${alias}/mappers`);
  }

  /** Creates a mapper. On success `data` holds the new mapper id. */
  createMapper(realm: string, alias: string, data: IdentityProviderMapper): Promise<ApiResponse<string>> {
    return this.http.post(path`/${realm}/identity-provider/instances/${alias}/mappers`, {
      identityProviderAlias: alias,
      ...data,
    });
  }

  getMapper(realm: string, alias: string, id: string): Promise<ApiResponse<IdentityProviderMapper>> {
    return this.http.get(path`/${realm}/identity-provider/instances/${alias}/mappers/${id}`);
  }

  updateMapper(realm: string, alias: string, id: string, data: IdentityProviderMapper): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/identity-provider/instances/${alias}/mappers/${id}`, data);
  }

  deleteMapper(realm: string, alias: string, id: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/identity-provider/instances/${alias}/mappers/${id}`);
  }
}

import { HttpClient, path } from '../http';
import { ScopeMappings } from '../role-mappings';
import ProtocolMappers from '../protocol-mappers';
import ClientAuthorization from './authorization';
import { ClientRoles } from '../roles';
import Client from '../../types/client';
import ClientScope from '../../types/client-scope';
import Credential from '../../types/credential';
import Certificate from '../../types/certificate';
import KeyStoreConfig from '../../types/key-store-config';
import GlobalRequestResult from '../../types/global-request-result';
import ManagementPermission from '../../types/management-permission';
import ProtocolMapperEvaluation from '../../types/protocol-mapper-evaluation';
import AccessToken from '../../types/access-token';
import IDToken from '../../types/id-token';
import SamlExampleResponse from '../../types/saml-example-response';
import Role from '../../types/role';
import User from '../../types/user';
import UserSession from '../../types/user-session';
import ApiResponse from '../../types/api-response';

export interface ClientListQueryParameters {
  clientId?: string;
  first?: number;
  max?: number;
  /** Search by attribute, e.g. `key1:value1 key2:value2`. */
  q?: string;
  /** When true, `clientId` is matched as a substring instead of exactly. */
  search?: boolean;
  viewableOnly?: boolean;
}

export interface EvaluateScopesQueryParameters {
  /** Space-separated optional client scopes to include, as in the `scope` parameter of a token request. */
  scope?: string;
  /** User the example is generated for. */
  userId?: string;
  /** Audience to target (generate-example-* only). */
  audience?: string;
}

/** Multipart fields accepted by the certificate upload endpoints. */
export interface CertificateUpload {
  /** e.g. `JKS`, `PKCS12`, `Certificate PEM`, `Public Key PEM` or `JSON Web Key Set`. */
  keystoreFormat: string;
  file: string | Uint8Array | Blob;
  keyAlias?: string;
  keyPassword?: string;
  storePassword?: string;
}

/** Builds the multipart form of a certificate upload. */
export function certificateForm(upload: CertificateUpload): FormData {
  const form = new FormData();
  const { file, ...fields } = upload;
  for (const [name, value] of Object.entries(fields)) {
    if (value !== undefined) {
      form.append(name, value);
    }
  }
  form.append('file', file instanceof Blob ? file : new Blob([file]), 'certificate');
  return form;
}

/** Whether a client scope is applied to every token (`default`) or only when requested (`optional`). */
export type ClientScopeKind = 'default' | 'optional';

export default class Clients {
  /** Scope mappings of a client (the roles allowed in its tokens). */
  readonly scopeMappings: ScopeMappings;
  /** Protocol mappers declared directly on a client. */
  readonly protocolMappers: ProtocolMappers;
  /** Authorization services: resource server, resources, scopes, policies and permissions. */
  readonly authorization: ClientAuthorization;
  /** Client roles, addressed by the client id (UUID) and role name. */
  readonly roles: ClientRoles;

  constructor(private readonly http: HttpClient) {
    const owner = (realm: string, id: string) => path`/${realm}/clients/${id}`;
    this.scopeMappings = new ScopeMappings(http, owner);
    this.protocolMappers = new ProtocolMappers(http, owner);
    this.authorization = new ClientAuthorization(http);
    this.roles = new ClientRoles(http);
  }

  /** Creates a client. On success `data` holds the new client id. */
  create(realm: string, data: Client): Promise<ApiResponse<string>> {
    return this.http.post(path`/${realm}/clients`, data);
  }

  get(realm: string, id: string): Promise<ApiResponse<Client>> {
    return this.http.get(path`/${realm}/clients/${id}`);
  }

  list(realm: string, options?: ClientListQueryParameters): Promise<ApiResponse<Client[]>> {
    return this.http.get(path`/${realm}/clients`, { ...options });
  }

  update(realm: string, id: string, data: Client): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/clients/${id}`, data);
  }

  delete(realm: string, id: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/clients/${id}`);
  }

  // Secrets and tokens

  /** Current client secret. Since 26.8 the value is masked for callers without `manage-clients`. */
  getSecret(realm: string, id: string): Promise<ApiResponse<Credential>> {
    return this.http.get(path`/${realm}/clients/${id}/client-secret`);
  }

  /** Generates a new client secret. With secret rotation enabled the old one stays valid as the rotated secret. */
  regenerateSecret(realm: string, id: string): Promise<ApiResponse<Credential>> {
    return this.http.post(path`/${realm}/clients/${id}/client-secret`);
  }

  getRotatedSecret(realm: string, id: string): Promise<ApiResponse<Credential>> {
    return this.http.get(path`/${realm}/clients/${id}/client-secret/rotated`);
  }

  /** Invalidates the rotated secret immediately. */
  deleteRotatedSecret(realm: string, id: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/clients/${id}/client-secret/rotated`);
  }

  /** Generates a new registration access token. On success `data` holds the client with `registrationAccessToken`. */
  regenerateRegistrationAccessToken(realm: string, id: string): Promise<ApiResponse<Client>> {
    return this.http.post(path`/${realm}/clients/${id}/registration-access-token`);
  }

  /** User that represents the client service account (`serviceAccountsEnabled: true`). */
  getServiceAccountUser(realm: string, id: string): Promise<ApiResponse<User>> {
    return this.http.get(path`/${realm}/clients/${id}/service-account-user`);
  }

  /** Certificate stored under a key attribute, e.g. `jwt.credential` or `saml.signing`. */
  getCertificate(realm: string, id: string, attribute: string): Promise<ApiResponse<Certificate>> {
    return this.http.get(path`/${realm}/clients/${id}/certificates/${attribute}`);
  }

  /**
   * Generates a new key pair and self-signed certificate under the attribute. Returns the certificate only.
   *
   * @deprecated by Keycloak; prefer JWKS URLs or realm keys.
   */
  generateCertificate(realm: string, id: string, attribute: string): Promise<ApiResponse<Certificate>> {
    return this.http.post(path`/${realm}/clients/${id}/certificates/${attribute}/generate`);
  }

  /**
   * Downloads a keystore with the public certificate stored under the attribute. On success `data` is a `Buffer`.
   *
   * @deprecated by Keycloak.
   */
  downloadKeystore(realm: string, id: string, attribute: string, config: KeyStoreConfig): Promise<ApiResponse<Buffer>> {
    return this.http.request('POST', path`/${realm}/clients/${id}/certificates/${attribute}/download`, {
      data: config,
      headers: { Accept: 'application/octet-stream' },
      responseType: 'arraybuffer',
    });
  }

  /**
   * Generates a new key pair and returns a keystore with the private key and certificate (`data` is a `Buffer`).
   * Keycloak keeps only the certificate.
   *
   * @deprecated by Keycloak.
   */
  generateAndDownloadKeystore(
    realm: string,
    id: string,
    attribute: string,
    config: KeyStoreConfig,
  ): Promise<ApiResponse<Buffer>> {
    return this.http.request('POST', path`/${realm}/clients/${id}/certificates/${attribute}/generate-and-download`, {
      data: config,
      headers: { Accept: 'application/octet-stream' },
      responseType: 'arraybuffer',
    });
  }

  /**
   * Uploads a certificate or keystore under the attribute (multipart). Use `keystoreFormat: 'Certificate PEM'` with
   * `file` holding the PEM, or a keystore format with its passwords.
   *
   * @param withPrivateKey `true` calls `/upload` (key pair and certificate), `false` calls `/upload-certificate`.
   */
  uploadCertificate(
    realm: string,
    id: string,
    attribute: string,
    upload: CertificateUpload,
    withPrivateKey = false,
  ): Promise<ApiResponse<Certificate>> {
    const target = withPrivateKey ? 'upload' : 'upload-certificate';
    return this.http.request('POST', path`/${realm}/clients/${id}/certificates/${attribute}/` + target, {
      data: certificateForm(upload),
    });
  }

  /**
   * Adapter configuration for a provider, e.g. `keycloak-oidc-keycloak-json` (JSON object) or
   * `keycloak-saml-subsystem` (XML string).
   */
  getInstallation<T = unknown>(realm: string, id: string, providerId: string): Promise<ApiResponse<T>> {
    return this.http.get(path`/${realm}/clients/${id}/installation/providers/${providerId}`);
  }

  // Client scopes

  /** Default or optional client scopes linked to the client. */
  listClientScopes(realm: string, id: string, kind: ClientScopeKind): Promise<ApiResponse<ClientScope[]>> {
    return this.http.get(path`/${realm}/clients/${id}/` + `${kind}-client-scopes`);
  }

  addClientScope(realm: string, id: string, kind: ClientScopeKind, clientScopeId: string): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/clients/${id}/` + `${kind}-client-scopes` + path`/${clientScopeId}`);
  }

  removeClientScope(
    realm: string,
    id: string,
    kind: ClientScopeKind,
    clientScopeId: string,
  ): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/clients/${id}/` + `${kind}-client-scopes` + path`/${clientScopeId}`);
  }

  // Evaluate scopes (admin console "Client scopes > Evaluate")

  generateExampleAccessToken(
    realm: string,
    id: string,
    options?: EvaluateScopesQueryParameters,
  ): Promise<ApiResponse<AccessToken>> {
    return this.http.get(path`/${realm}/clients/${id}/evaluate-scopes/generate-example-access-token`, { ...options });
  }

  generateExampleIdToken(
    realm: string,
    id: string,
    options?: EvaluateScopesQueryParameters,
  ): Promise<ApiResponse<IDToken>> {
    return this.http.get(path`/${realm}/clients/${id}/evaluate-scopes/generate-example-id-token`, { ...options });
  }

  generateExampleUserInfo(
    realm: string,
    id: string,
    options?: Omit<EvaluateScopesQueryParameters, 'audience'>,
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return this.http.get(path`/${realm}/clients/${id}/evaluate-scopes/generate-example-userinfo`, { ...options });
  }

  generateExampleSamlResponse(
    realm: string,
    id: string,
    options?: EvaluateScopesQueryParameters,
  ): Promise<ApiResponse<SamlExampleResponse>> {
    return this.http.get(path`/${realm}/clients/${id}/evaluate-scopes/generate-example-saml-response`, {
      ...options,
    });
  }

  /** Protocol mappers that would be applied for the given scope parameter. */
  evaluateProtocolMappers(
    realm: string,
    id: string,
    options?: { scope?: string },
  ): Promise<ApiResponse<ProtocolMapperEvaluation[]>> {
    return this.http.get(path`/${realm}/clients/${id}/evaluate-scopes/protocol-mappers`, { ...options });
  }

  /**
   * Roles of `roleContainerId` (the realm name or a client id) that the client is (or is not) allowed to put in
   * tokens for the given scope parameter.
   */
  evaluateScopeMappings(
    realm: string,
    id: string,
    roleContainerId: string,
    granted: boolean,
    options?: { scope?: string },
  ): Promise<ApiResponse<Role[]>> {
    const suffix = granted ? 'granted' : 'not-granted';
    return this.http.get(path`/${realm}/clients/${id}/evaluate-scopes/scope-mappings/${roleContainerId}/` + suffix, {
      ...options,
    });
  }

  // Sessions

  getSessionCount(realm: string, id: string): Promise<ApiResponse<{ count: number }>> {
    return this.http.get(path`/${realm}/clients/${id}/session-count`);
  }

  listSessions(
    realm: string,
    id: string,
    options?: { first?: number; max?: number },
  ): Promise<ApiResponse<UserSession[]>> {
    return this.http.get(path`/${realm}/clients/${id}/user-sessions`, { ...options });
  }

  getOfflineSessionCount(realm: string, id: string): Promise<ApiResponse<{ count: number }>> {
    return this.http.get(path`/${realm}/clients/${id}/offline-session-count`);
  }

  listOfflineSessions(
    realm: string,
    id: string,
    options?: { first?: number; max?: number },
  ): Promise<ApiResponse<UserSession[]>> {
    return this.http.get(path`/${realm}/clients/${id}/offline-sessions`, { ...options });
  }

  // Cluster nodes and revocation (clients with an admin URL)

  /** Pushes the realm not-before revocation policy to the client admin URL. */
  pushRevocation(realm: string, id: string): Promise<ApiResponse<GlobalRequestResult>> {
    return this.http.post(path`/${realm}/clients/${id}/push-revocation`);
  }

  /** Registers a cluster node of the client. */
  registerNode(realm: string, id: string, node: string): Promise<ApiResponse<void>> {
    return this.http.post(path`/${realm}/clients/${id}/nodes`, { node });
  }

  unregisterNode(realm: string, id: string, node: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/clients/${id}/nodes/${node}`);
  }

  testNodesAvailable(realm: string, id: string): Promise<ApiResponse<GlobalRequestResult>> {
    return this.http.get(path`/${realm}/clients/${id}/test-nodes-available`);
  }

  // Fine-grained admin permissions

  getManagementPermissions(realm: string, id: string): Promise<ApiResponse<ManagementPermission>> {
    return this.http.get(path`/${realm}/clients/${id}/management/permissions`);
  }

  /** Enables or disables fine-grained admin permissions for the client. On success `data` holds the new state. */
  updateManagementPermissions(
    realm: string,
    id: string,
    data: ManagementPermission,
  ): Promise<ApiResponse<ManagementPermission>> {
    return this.http.put(path`/${realm}/clients/${id}/management/permissions`, data);
  }
}

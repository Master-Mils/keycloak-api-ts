import { HttpClient, path } from '../http';
import ResourceServer from '../../types/resource-server';
import Resource from '../../types/resource';
import Scope from '../../types/scope';
import Policy from '../../types/policy';
import AbstractPolicy from '../../types/abstract-policy';
import PolicyProvider from '../../types/policy-provider';
import PolicyEvaluationRequest from '../../types/policy-evaluation-request';
import PolicyEvaluationResponse from '../../types/policy-evaluation-response';
import ApiResponse from '../../types/api-response';

export interface ResourceListQueryParameters {
  _id?: string;
  deep?: boolean;
  exactName?: boolean;
  first?: number;
  matchingUri?: boolean;
  max?: number;
  name?: string;
  owner?: string;
  scope?: string;
  type?: string;
  uri?: string;
}

export interface ScopeListQueryParameters {
  first?: number;
  max?: number;
  name?: string;
  scopeId?: string;
}

export interface PolicyListQueryParameters {
  fields?: string;
  first?: number;
  max?: number;
  name?: string;
  owner?: string;
  permission?: boolean;
  policyId?: string;
  resource?: string;
  resourceType?: string;
  scope?: string;
  /** Policy type, e.g. `role`, `user`, `js`, `resource`, `scope`. */
  type?: string;
}

/** Policy or permission kinds of the resource server: `policy` for policies, `permission` for permissions. */
type PolicyKind = 'policy' | 'permission';

/**
 * Authorization services of a client (`authorizationServicesEnabled: true`).
 * Every method takes the internal client id (`client.id`).
 */
/** A policy or permission body: `type` names the provider and selects the endpoint. */
export type TypedPolicy = Policy & { type: string } & Record<string, unknown>;

export default class ClientAuthorization {
  constructor(private readonly http: HttpClient) {}

  private url(realm: string, clientId: string, suffix = ''): string {
    return path`/${realm}/clients/${clientId}/authz/resource-server` + suffix;
  }

  getResourceServer(realm: string, clientId: string): Promise<ApiResponse<ResourceServer>> {
    return this.http.get(this.url(realm, clientId));
  }

  updateResourceServer(realm: string, clientId: string, data: ResourceServer): Promise<ApiResponse<void>> {
    return this.http.put(this.url(realm, clientId), data);
  }

  /** Imports resources, scopes and policies exported from another resource server. */
  importResourceServer(realm: string, clientId: string, data: ResourceServer): Promise<ApiResponse<void>> {
    return this.http.post(this.url(realm, clientId, '/import'), data);
  }

  /** Exports the resource server settings, resources, scopes and policies. */
  exportSettings(realm: string, clientId: string): Promise<ApiResponse<ResourceServer>> {
    return this.http.get(this.url(realm, clientId, '/settings'));
  }

  // Resources

  listResources(
    realm: string,
    clientId: string,
    options?: ResourceListQueryParameters,
  ): Promise<ApiResponse<Resource[]>> {
    return this.http.get(this.url(realm, clientId, '/resource'), { ...options });
  }

  /** Creates a resource. On success `data` holds the created resource, including its `_id`. */
  createResource(realm: string, clientId: string, data: Resource): Promise<ApiResponse<Resource>> {
    return this.http.post(this.url(realm, clientId, '/resource'), data);
  }

  /** Finds a resource by exact name. Resolves with `data` undefined (204) when there is none. */
  findResource(realm: string, clientId: string, name: string): Promise<ApiResponse<Resource | undefined>> {
    return this.http.get(this.url(realm, clientId, '/resource/search'), { name });
  }

  getResource(realm: string, clientId: string, resourceId: string): Promise<ApiResponse<Resource>> {
    return this.http.get(this.url(realm, clientId, path`/resource/${resourceId}`));
  }

  updateResource(realm: string, clientId: string, resourceId: string, data: Resource): Promise<ApiResponse<void>> {
    return this.http.put(this.url(realm, clientId, path`/resource/${resourceId}`), data);
  }

  deleteResource(realm: string, clientId: string, resourceId: string): Promise<ApiResponse<void>> {
    return this.http.delete(this.url(realm, clientId, path`/resource/${resourceId}`));
  }

  getResourceAttributes(
    realm: string,
    clientId: string,
    resourceId: string,
  ): Promise<ApiResponse<Record<string, string[]>>> {
    return this.http.get(this.url(realm, clientId, path`/resource/${resourceId}/attributes`));
  }

  listResourcePermissions(realm: string, clientId: string, resourceId: string): Promise<ApiResponse<Policy[]>> {
    return this.http.get(this.url(realm, clientId, path`/resource/${resourceId}/permissions`));
  }

  listResourceScopes(realm: string, clientId: string, resourceId: string): Promise<ApiResponse<Scope[]>> {
    return this.http.get(this.url(realm, clientId, path`/resource/${resourceId}/scopes`));
  }

  // Scopes

  listScopes(realm: string, clientId: string, options?: ScopeListQueryParameters): Promise<ApiResponse<Scope[]>> {
    return this.http.get(this.url(realm, clientId, '/scope'), { ...options });
  }

  /** Creates an authorization scope. On success `data` holds the created scope, including its `id`. */
  createScope(realm: string, clientId: string, data: Scope): Promise<ApiResponse<Scope>> {
    return this.http.post(this.url(realm, clientId, '/scope'), data);
  }

  /** Finds a scope by exact name. Resolves with `data` undefined (204) when there is none. */
  findScope(realm: string, clientId: string, name: string): Promise<ApiResponse<Scope | undefined>> {
    return this.http.get(this.url(realm, clientId, '/scope/search'), { name });
  }

  getScope(realm: string, clientId: string, scopeId: string): Promise<ApiResponse<Scope>> {
    return this.http.get(this.url(realm, clientId, path`/scope/${scopeId}`));
  }

  updateScope(realm: string, clientId: string, scopeId: string, data: Scope): Promise<ApiResponse<void>> {
    return this.http.put(this.url(realm, clientId, path`/scope/${scopeId}`), data);
  }

  deleteScope(realm: string, clientId: string, scopeId: string): Promise<ApiResponse<void>> {
    return this.http.delete(this.url(realm, clientId, path`/scope/${scopeId}`));
  }

  listScopePermissions(realm: string, clientId: string, scopeId: string): Promise<ApiResponse<Policy[]>> {
    return this.http.get(this.url(realm, clientId, path`/scope/${scopeId}/permissions`));
  }

  listScopeResources(realm: string, clientId: string, scopeId: string): Promise<ApiResponse<Resource[]>> {
    return this.http.get(this.url(realm, clientId, path`/scope/${scopeId}/resources`));
  }

  // Policies

  listPolicies(
    realm: string,
    clientId: string,
    options?: PolicyListQueryParameters,
  ): Promise<ApiResponse<AbstractPolicy[]>> {
    return this.list('policy', realm, clientId, options);
  }

  /**
   * Creates a policy. `type` selects the provider (`role`, `user`, `group`, `client`, `time`, `aggregate`...) and the
   * other fields follow that provider, e.g. `{ type: 'role', name: 'admins', roles: [{ id, required: true }] }`.
   * On success `data` holds the created policy.
   */
  createPolicy(realm: string, clientId: string, data: TypedPolicy): Promise<ApiResponse<Policy>> {
    return this.http.post(this.url(realm, clientId, path`/policy/${data.type}`), data);
  }

  /**
   * Creates a policy through the generic endpoint, which only accepts the stored form: provider settings go in the
   * `config` map as strings (e.g. `{ type: 'js', name, config: { code: '...' } }`). Prefer `createPolicy`.
   */
  createPolicyRepresentation(realm: string, clientId: string, data: Policy): Promise<ApiResponse<Policy>> {
    return this.http.post(this.url(realm, clientId, '/policy'), data);
  }

  /** Finds a policy by exact name. Resolves with `data` undefined (204) when there is none. */
  findPolicy(
    realm: string,
    clientId: string,
    name: string,
    options?: { fields?: string },
  ): Promise<ApiResponse<AbstractPolicy | undefined>> {
    return this.http.get(this.url(realm, clientId, '/policy/search'), { ...options, name });
  }

  getPolicy(realm: string, clientId: string, policyId: string): Promise<ApiResponse<Policy>> {
    return this.http.get(this.url(realm, clientId, path`/policy/${policyId}`));
  }

  /**
   * Replaces a policy or permission. `type` is required and the provider fields must be sent again (e.g. `roles`),
   * as in `createPolicy`.
   */
  updatePolicy(realm: string, clientId: string, policyId: string, data: TypedPolicy): Promise<ApiResponse<void>> {
    return this.http.put(this.url(realm, clientId, path`/policy/${data.type}/${policyId}`), data);
  }

  /** Deletes a policy or a permission. */
  deletePolicy(realm: string, clientId: string, policyId: string): Promise<ApiResponse<void>> {
    return this.http.delete(this.url(realm, clientId, path`/policy/${policyId}`));
  }

  listPolicyProviders(realm: string, clientId: string): Promise<ApiResponse<PolicyProvider[]>> {
    return this.http.get(this.url(realm, clientId, '/policy/providers'));
  }

  /** Evaluates the policies for a user, resources and context, as the admin console "Evaluate" tab does. */
  evaluate(
    realm: string,
    clientId: string,
    request: PolicyEvaluationRequest,
  ): Promise<ApiResponse<PolicyEvaluationResponse>> {
    return this.http.post(this.url(realm, clientId, '/policy/evaluate'), request);
  }

  // Permissions

  listPermissions(
    realm: string,
    clientId: string,
    options?: PolicyListQueryParameters,
  ): Promise<ApiResponse<AbstractPolicy[]>> {
    return this.list('permission', realm, clientId, options);
  }

  /**
   * Creates a permission: `{ type: 'resource' | 'scope', name, resources?, scopes?, policies, decisionStrategy? }`.
   * On success `data` holds the created permission. Use the policy methods to get, update or delete it.
   */
  createPermission(realm: string, clientId: string, data: TypedPolicy): Promise<ApiResponse<Policy>> {
    return this.http.post(this.url(realm, clientId, path`/permission/${data.type}`), data);
  }

  /** Creates a permission through the generic endpoint, in the stored `config` form. Prefer `createPermission`. */
  createPermissionRepresentation(realm: string, clientId: string, data: Policy): Promise<ApiResponse<Policy>> {
    return this.http.post(this.url(realm, clientId, '/permission'), data);
  }

  /** Finds a permission by exact name. Resolves with `data` undefined (204) when there is none. */
  findPermission(
    realm: string,
    clientId: string,
    name: string,
    options?: { fields?: string },
  ): Promise<ApiResponse<AbstractPolicy | undefined>> {
    return this.http.get(this.url(realm, clientId, '/permission/search'), { ...options, name });
  }

  listPermissionProviders(realm: string, clientId: string): Promise<ApiResponse<PolicyProvider[]>> {
    return this.http.get(this.url(realm, clientId, '/permission/providers'));
  }

  evaluatePermissions(
    realm: string,
    clientId: string,
    request: PolicyEvaluationRequest,
  ): Promise<ApiResponse<PolicyEvaluationResponse>> {
    return this.http.post(this.url(realm, clientId, '/permission/evaluate'), request);
  }

  private list(
    kind: PolicyKind,
    realm: string,
    clientId: string,
    options?: PolicyListQueryParameters,
  ): Promise<ApiResponse<AbstractPolicy[]>> {
    return this.http.get(this.url(realm, clientId, `/${kind}`), { ...options });
  }
}

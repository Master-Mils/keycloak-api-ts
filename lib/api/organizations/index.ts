import { HttpClient, path } from '../http';
import { RoleMappings } from '../role-mappings';
import Organization from '../../types/organization';
import OrganizationInvitation from '../../types/organization-invitation';
import OrganizationIdentityProviderLink from '../../types/organization-identity-provider-link';
import IdentityProvider from '../../types/identity-provider';
import Member from '../../types/member';
import MembershipType from '../../types/membership-type';
import Group from '../../types/group';
import ApiResponse from '../../types/api-response';

export interface OrganizationListQueryParameters {
  briefRepresentation?: boolean;
  exact?: boolean;
  first?: number;
  /** Organizations linked to this identity provider alias (26.8+). */
  identityProvider?: string;
  max?: number;
  /** Search by attribute, e.g. `key1:value1 key2:value2`. */
  q?: string;
  /** Matches the name or a domain. */
  search?: string;
}

export interface MemberListQueryParameters {
  briefRepresentation?: boolean;
  exact?: boolean;
  first?: number;
  max?: number;
  membershipType?: MembershipType;
  search?: string;
}

export interface InvitationListQueryParameters {
  email?: string;
  first?: number;
  firstName?: string;
  lastName?: string;
  max?: number;
  search?: string;
  /** `PENDING` or `EXPIRED`. */
  status?: string;
}

export interface OrganizationGroupListQueryParameters {
  briefRepresentation?: boolean;
  exact?: boolean;
  first?: number;
  max?: number;
  populateHierarchy?: boolean;
  q?: string;
  search?: string;
  subGroupsCount?: boolean;
}

/** Identifies a group that belongs to an organization. */
export interface OrganizationGroupRef {
  organizationId: string;
  groupId: string;
}

/** Groups owned by an organization (Keycloak 26.7+). */
export class OrganizationGroups {
  /** Realm and client role mappings of an organization group. */
  readonly roleMappings: RoleMappings<OrganizationGroupRef>;

  constructor(private readonly http: HttpClient) {
    this.roleMappings = new RoleMappings<OrganizationGroupRef>(
      http,
      (realm, { organizationId, groupId }) => path`/${realm}/organizations/${organizationId}/groups/${groupId}`,
    );
  }

  /** Creates a top-level organization group. On success `data` holds the new group id. */
  create(realm: string, orgId: string, data: Group): Promise<ApiResponse<string>> {
    return this.http.post(path`/${realm}/organizations/${orgId}/groups`, data);
  }

  /** Creates (or moves) a child group. On success `data` holds the child group id. */
  createChild(realm: string, orgId: string, parentId: string, data: Group): Promise<ApiResponse<string>> {
    return this.http.post(path`/${realm}/organizations/${orgId}/groups/${parentId}/children`, data);
  }

  list(realm: string, orgId: string, options?: OrganizationGroupListQueryParameters): Promise<ApiResponse<Group[]>> {
    return this.http.get(path`/${realm}/organizations/${orgId}/groups`, { ...options });
  }

  listChildren(
    realm: string,
    orgId: string,
    groupId: string,
    options?: {
      briefRepresentation?: boolean;
      exact?: boolean;
      first?: number;
      max?: number;
      search?: string;
      subGroupsCount?: boolean;
    },
  ): Promise<ApiResponse<Group[]>> {
    return this.http.get(path`/${realm}/organizations/${orgId}/groups/${groupId}/children`, { ...options });
  }

  get(realm: string, orgId: string, groupId: string): Promise<ApiResponse<Group>> {
    return this.http.get(path`/${realm}/organizations/${orgId}/groups/${groupId}`);
  }

  /** Finds a group by its path inside the organization, e.g. `engineering/platform`. */
  getByPath(realm: string, orgId: string, groupPath: string): Promise<ApiResponse<Group>> {
    const segments = groupPath.split('/').filter(Boolean).map(encodeURIComponent).join('/');
    return this.http.get(path`/${realm}/organizations/${orgId}/groups/group-by-path/` + segments);
  }

  update(realm: string, orgId: string, groupId: string, data: Group): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/organizations/${orgId}/groups/${groupId}`, data);
  }

  delete(realm: string, orgId: string, groupId: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/organizations/${orgId}/groups/${groupId}`);
  }

  listMembers(
    realm: string,
    orgId: string,
    groupId: string,
    options?: { briefRepresentation?: boolean; first?: number; max?: number },
  ): Promise<ApiResponse<Member[]>> {
    return this.http.get(path`/${realm}/organizations/${orgId}/groups/${groupId}/members`, { ...options });
  }

  /** Adds an organization member to the group. */
  addMember(realm: string, orgId: string, groupId: string, userId: string): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/organizations/${orgId}/groups/${groupId}/members/${userId}`);
  }

  removeMember(realm: string, orgId: string, groupId: string, userId: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/organizations/${orgId}/groups/${groupId}/members/${userId}`);
  }
}

/**
 * Organizations (Keycloak 26+). The realm must have `organizationsEnabled: true`; older servers answer 404.
 */
export default class Organizations {
  /** Groups owned by an organization (Keycloak 26.7+). */
  readonly groups: OrganizationGroups;

  constructor(private readonly http: HttpClient) {
    this.groups = new OrganizationGroups(http);
  }

  /** Creates an organization. `domains` is required unless the realm allows organizations without one. */
  create(realm: string, data: Organization): Promise<ApiResponse<string>> {
    return this.http.post(path`/${realm}/organizations`, data);
  }

  get(realm: string, orgId: string): Promise<ApiResponse<Organization>> {
    return this.http.get(path`/${realm}/organizations/${orgId}`);
  }

  list(realm: string, options?: OrganizationListQueryParameters): Promise<ApiResponse<Organization[]>> {
    return this.http.get(path`/${realm}/organizations`, { ...options });
  }

  /** Number of organizations (26.3+). */
  count(
    realm: string,
    options?: Omit<OrganizationListQueryParameters, 'briefRepresentation' | 'first' | 'max'>,
  ): Promise<ApiResponse<number>> {
    return this.http.get(path`/${realm}/organizations/count`, { ...options });
  }

  update(realm: string, orgId: string, data: Organization): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/organizations/${orgId}`, data);
  }

  delete(realm: string, orgId: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/organizations/${orgId}`);
  }

  /** Organizations a user belongs to. */
  listByMember(
    realm: string,
    userId: string,
    options?: { briefRepresentation?: boolean },
  ): Promise<ApiResponse<Organization[]>> {
    return this.http.get(path`/${realm}/organizations/members/${userId}/organizations`, { ...options });
  }

  // Members

  listMembers(realm: string, orgId: string, options?: MemberListQueryParameters): Promise<ApiResponse<Member[]>> {
    return this.http.get(path`/${realm}/organizations/${orgId}/members`, { ...options });
  }

  countMembers(realm: string, orgId: string): Promise<ApiResponse<number>> {
    return this.http.get(path`/${realm}/organizations/${orgId}/members/count`);
  }

  getMember(realm: string, orgId: string, userId: string): Promise<ApiResponse<Member>> {
    return this.http.get(path`/${realm}/organizations/${orgId}/members/${userId}`);
  }

  /** Adds an existing realm user as an unmanaged member. */
  addMember(realm: string, orgId: string, userId: string): Promise<ApiResponse<string>> {
    return this.http.request('POST', path`/${realm}/organizations/${orgId}/members`, {
      data: JSON.stringify(userId),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  removeMember(realm: string, orgId: string, userId: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/organizations/${orgId}/members/${userId}`);
  }

  /** Changes the membership type of a member (26.8+). */
  updateMembershipType(
    realm: string,
    orgId: string,
    userId: string,
    membershipType: MembershipType,
  ): Promise<ApiResponse<void>> {
    return this.http.request('PUT', path`/${realm}/organizations/${orgId}/members/${userId}/membership-type`, {
      data: JSON.stringify(membershipType),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /** Organizations the member belongs to. */
  listMemberOrganizations(
    realm: string,
    orgId: string,
    userId: string,
    options?: { briefRepresentation?: boolean },
  ): Promise<ApiResponse<Organization[]>> {
    return this.http.get(path`/${realm}/organizations/${orgId}/members/${userId}/organizations`, { ...options });
  }

  /** Organization groups the member belongs to (26.7+). */
  listMemberGroups(
    realm: string,
    orgId: string,
    userId: string,
    options?: { briefRepresentation?: boolean; first?: number; max?: number },
  ): Promise<ApiResponse<Group[]>> {
    return this.http.get(path`/${realm}/organizations/${orgId}/members/${userId}/groups`, { ...options });
  }

  /** Emails an invitation link to an existing realm user. Requires SMTP to be configured on the realm. */
  inviteExistingUser(
    realm: string,
    orgId: string,
    userId: string,
    options?: { clientId?: string },
  ): Promise<ApiResponse<void>> {
    return this.form(path`/${realm}/organizations/${orgId}/members/invite-existing-user`, { id: userId }, options);
  }

  /**
   * Emails a registration invitation. Requires SMTP to be configured on the realm.
   * `options.clientId` (26.8+) selects the client the invitation link redirects to.
   */
  inviteUser(
    realm: string,
    orgId: string,
    invitee: { email: string; firstName?: string; lastName?: string },
    options?: { clientId?: string },
  ): Promise<ApiResponse<void>> {
    return this.form(path`/${realm}/organizations/${orgId}/members/invite-user`, invitee, options);
  }

  // Invitations (26.5+)

  listInvitations(
    realm: string,
    orgId: string,
    options?: InvitationListQueryParameters,
  ): Promise<ApiResponse<OrganizationInvitation[]>> {
    return this.http.get(path`/${realm}/organizations/${orgId}/invitations`, { ...options });
  }

  getInvitation(realm: string, orgId: string, invitationId: string): Promise<ApiResponse<OrganizationInvitation>> {
    return this.http.get(path`/${realm}/organizations/${orgId}/invitations/${invitationId}`);
  }

  deleteInvitation(realm: string, orgId: string, invitationId: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/organizations/${orgId}/invitations/${invitationId}`);
  }

  resendInvitation(realm: string, orgId: string, invitationId: string): Promise<ApiResponse<void>> {
    return this.http.post(path`/${realm}/organizations/${orgId}/invitations/${invitationId}/resend`);
  }

  // Identity providers

  listIdentityProviders(realm: string, orgId: string): Promise<ApiResponse<IdentityProvider[]>> {
    return this.http.get(path`/${realm}/organizations/${orgId}/identity-providers`);
  }

  getIdentityProvider(realm: string, orgId: string, alias: string): Promise<ApiResponse<IdentityProvider>> {
    return this.http.get(path`/${realm}/organizations/${orgId}/identity-providers/${alias}`);
  }

  /** Links an existing identity provider to the organization. */
  linkIdentityProvider(realm: string, orgId: string, alias: string): Promise<ApiResponse<void>> {
    return this.http.request('POST', path`/${realm}/organizations/${orgId}/identity-providers`, {
      data: JSON.stringify(alias),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /** Updates the link settings (domain, redirect when email matches, groups...) (26.8+). */
  updateIdentityProviderLink(
    realm: string,
    orgId: string,
    alias: string,
    data: OrganizationIdentityProviderLink,
  ): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/organizations/${orgId}/identity-providers/${alias}`, data);
  }

  unlinkIdentityProvider(realm: string, orgId: string, alias: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/organizations/${orgId}/identity-providers/${alias}`);
  }

  /** Organization groups that members brokered through the provider join (26.7+). */
  listIdentityProviderGroups(realm: string, orgId: string, alias: string): Promise<ApiResponse<Group[]>> {
    return this.http.get(path`/${realm}/organizations/${orgId}/identity-providers/${alias}/groups`);
  }

  private form(
    url: string,
    fields: Record<string, string | undefined>,
    options?: { clientId?: string },
  ): Promise<ApiResponse<void>> {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        body.append(key, value);
      }
    }
    return this.http.request('POST', url, {
      data: body.toString(),
      params: { client_id: options?.clientId },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  }
}

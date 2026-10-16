import { HttpClient, path } from '../http';
import Realm from '../../types/realm';
import Event from '../../types/event';
import AdminEvent from '../../types/admin-event';
import RealmEventsConfig from '../../types/realm-events-config';
import KeysMetadata from '../../types/keys-metadata';
import Group from '../../types/group';
import Client from '../../types/client';
import ClientPolicies from '../../types/client-policies';
import ClientProfiles from '../../types/client-profiles';
import ClientTypes from '../../types/client-types';
import GlobalRequestResult from '../../types/global-request-result';
import ManagementPermission from '../../types/management-permission';
import ApiResponse from '../../types/api-response';

interface EventPagingQueryParameters {
  /** Inclusive lower bound, `yyyy-MM-dd` or epoch milliseconds. */
  dateFrom?: string;
  /** Inclusive upper bound, `yyyy-MM-dd` or epoch milliseconds. */
  dateTo?: string;
  /** `asc` or `desc` (default) by time. */
  direction?: 'asc' | 'desc';
  first?: number;
  max?: number;
}

export interface EventQueryParameters extends EventPagingQueryParameters {
  client?: string;
  ipAddress?: string;
  /** Event types, e.g. `['LOGIN', 'LOGIN_ERROR']`. */
  type?: string[];
  user?: string;
}

export interface AdminEventQueryParameters extends EventPagingQueryParameters {
  authClient?: string;
  authIpAddress?: string;
  authRealm?: string;
  authUser?: string;
  /** `CREATE`, `UPDATE`, `DELETE` or `ACTION`. */
  operationTypes?: string[];
  resourcePath?: string;
  /** e.g. `USER`, `CLIENT`, `REALM_ROLE`. */
  resourceTypes?: string[];
}

export interface PartialImportOptions extends Realm {
  /** What to do with resources that already exist. */
  ifResourceExists?: 'FAIL' | 'SKIP' | 'OVERWRITE';
}

export interface PartialImportResult {
  added?: number;
  skipped?: number;
  overwritten?: number;
  results?: Array<{ action?: string; resourceType?: string; resourceName?: string; id?: string }>;
}

/** Joins array values as repeated query parameters (`type=A&type=B`), which `QueryParams` cannot express. */
function repeated(url: string, params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined && item !== null) {
        search.append(key, String(item));
      }
    }
  }
  const query = search.toString();
  return query ? `${url}?${query}` : url;
}

export default class Realms {
  constructor(private readonly http: HttpClient) {}

  /** Imports (creates) a realm from a full representation. */
  import(data: Realm): Promise<ApiResponse<string>> {
    return this.http.post('', data);
  }

  /** Lists the realms the caller can view. */
  list(options?: { briefRepresentation?: boolean }): Promise<ApiResponse<Realm[]>> {
    return this.http.get('', { ...options });
  }

  /**
   * Gets the top-level representation of the realm. It does not include nested users or clients.
   *
   * @param realm realm name (not id!)
   */
  get(realm: string): Promise<ApiResponse<Realm>> {
    return this.http.get(path`/${realm}`);
  }

  /**
   * Updates the top-level information of the realm. Users, roles or clients in the representation are ignored.
   *
   * @param realm realm name (not id!)
   */
  update(realm: string, data: Realm): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}`, data);
  }

  /** @param realm realm name (not id!) */
  delete(realm: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}`);
  }

  // Import and export

  /** Exports the realm. Secrets are masked in the result. */
  partialExport(
    realm: string,
    options?: { exportClients?: boolean; exportGroupsAndRoles?: boolean },
  ): Promise<ApiResponse<Realm>> {
    return this.http.post(path`/${realm}/partial-export`, undefined, { ...options });
  }

  /** Imports users, clients, groups, roles and identity providers into an existing realm. */
  partialImport(realm: string, data: PartialImportOptions): Promise<ApiResponse<PartialImportResult>> {
    return this.http.post(path`/${realm}/partialImport`, data);
  }

  // Events

  /** Login and user events. Requires `eventsEnabled` on the realm. */
  listEvents(realm: string, options: EventQueryParameters = {}): Promise<ApiResponse<Event[]>> {
    return this.http.get(repeated(path`/${realm}/events`, { ...options }));
  }

  deleteEvents(realm: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/events`);
  }

  /** Admin events. Requires `adminEventsEnabled` on the realm. */
  listAdminEvents(realm: string, options: AdminEventQueryParameters = {}): Promise<ApiResponse<AdminEvent[]>> {
    return this.http.get(repeated(path`/${realm}/admin-events`, { ...options }));
  }

  deleteAdminEvents(realm: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/admin-events`);
  }

  getEventsConfig(realm: string): Promise<ApiResponse<RealmEventsConfig>> {
    return this.http.get(path`/${realm}/events/config`);
  }

  /** Enables events and admin events, sets listeners, enabled types and expiration. */
  updateEventsConfig(realm: string, data: RealmEventsConfig): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/events/config`, data);
  }

  // Keys

  /** Active, passive and disabled keys of the realm, with the active key id per algorithm. */
  getKeys(realm: string): Promise<ApiResponse<KeysMetadata>> {
    return this.http.get(path`/${realm}/keys`);
  }

  // Localization (realm overrides of theme messages)

  /** Locales that have realm overrides. */
  listLocales(realm: string): Promise<ApiResponse<string[]>> {
    return this.http.get(path`/${realm}/localization`);
  }

  getLocalizationTexts(
    realm: string,
    locale: string,
    options?: { useRealmDefaultLocaleFallback?: boolean },
  ): Promise<ApiResponse<Record<string, string>>> {
    return this.http.get(path`/${realm}/localization/${locale}`, { ...options });
  }

  /** Adds or replaces several texts of a locale at once. */
  importLocalizationTexts(realm: string, locale: string, texts: Record<string, string>): Promise<ApiResponse<void>> {
    return this.http.post(path`/${realm}/localization/${locale}`, texts);
  }

  deleteLocalizationTexts(realm: string, locale: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/localization/${locale}`);
  }

  getLocalizationText(realm: string, locale: string, key: string): Promise<ApiResponse<string>> {
    return this.http.request('GET', path`/${realm}/localization/${locale}/${key}`, { responseType: 'text' });
  }

  updateLocalizationText(realm: string, locale: string, key: string, text: string): Promise<ApiResponse<void>> {
    return this.http.request('PUT', path`/${realm}/localization/${locale}/${key}`, {
      data: text,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  deleteLocalizationText(realm: string, locale: string, key: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/localization/${locale}/${key}`);
  }

  // Default groups (assigned to new users)

  listDefaultGroups(realm: string): Promise<ApiResponse<Group[]>> {
    return this.http.get(path`/${realm}/default-groups`);
  }

  addDefaultGroup(realm: string, groupId: string): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/default-groups/${groupId}`);
  }

  removeDefaultGroup(realm: string, groupId: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/default-groups/${groupId}`);
  }

  // Client policies and client types

  getClientPolicies(
    realm: string,
    options?: { includeGlobalPolicies?: boolean },
  ): Promise<ApiResponse<ClientPolicies>> {
    return this.http.get(path`/${realm}/client-policies/policies`, {
      'include-global-policies': options?.includeGlobalPolicies,
    });
  }

  updateClientPolicies(realm: string, data: ClientPolicies): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/client-policies/policies`, data);
  }

  getClientProfiles(
    realm: string,
    options?: { includeGlobalProfiles?: boolean },
  ): Promise<ApiResponse<ClientProfiles>> {
    return this.http.get(path`/${realm}/client-policies/profiles`, {
      'include-global-profiles': options?.includeGlobalProfiles,
    });
  }

  updateClientProfiles(realm: string, data: ClientProfiles): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/client-policies/profiles`, data);
  }

  /** Client types (26+, preview feature `client-types`). */
  getClientTypes(realm: string): Promise<ApiResponse<ClientTypes>> {
    return this.http.get(path`/${realm}/client-types`);
  }

  updateClientTypes(realm: string, data: ClientTypes): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/client-types`, data);
  }

  /**
   * Converts a client description (OIDC client registration JSON, SAML entity descriptor XML...) into a client
   * representation, without creating it.
   */
  convertClientDescription(realm: string, description: string): Promise<ApiResponse<Client>> {
    return this.http.request('POST', path`/${realm}/client-description-converter`, {
      data: description,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // Sessions and revocation

  /** Active and offline session counts per client. */
  getClientSessionStats(realm: string): Promise<ApiResponse<Array<Record<string, string>>>> {
    return this.http.get(path`/${realm}/client-session-stats`);
  }

  /** Removes every user session of the realm. */
  logoutAll(realm: string): Promise<ApiResponse<GlobalRequestResult>> {
    return this.http.post(path`/${realm}/logout-all`);
  }

  /** Removes one user session (set `isOffline` for an offline session). */
  deleteSession(realm: string, sessionId: string, options?: { isOffline?: boolean }): Promise<ApiResponse<void>> {
    return this.http.request('DELETE', path`/${realm}/sessions/${sessionId}`, { params: { ...options } });
  }

  /** Pushes the not-before revocation policy to every client with an admin URL. */
  pushRevocation(realm: string): Promise<ApiResponse<GlobalRequestResult>> {
    return this.http.post(path`/${realm}/push-revocation`);
  }

  // Miscellaneous

  /**
   * Sends a test e-mail to the calling admin user with the given SMTP settings (the `smtpServer` map of the
   * realm). The admin user needs an e-mail address.
   */
  testSmtpConnection(realm: string, settings: Record<string, string>): Promise<ApiResponse<void>> {
    return this.http.post(path`/${realm}/testSMTPConnection`, settings);
  }

  /** Required actions that register credentials, e.g. `CONFIGURE_TOTP` or `webauthn-register`. */
  listCredentialRegistrators(realm: string): Promise<ApiResponse<string[]>> {
    return this.http.get(path`/${realm}/credential-registrators`);
  }

  /** Fine-grained admin permissions for managing the realm users (FGAP v1). */
  getUsersManagementPermissions(realm: string): Promise<ApiResponse<ManagementPermission>> {
    return this.http.get(path`/${realm}/users-management-permissions`);
  }

  updateUsersManagementPermissions(
    realm: string,
    data: ManagementPermission,
  ): Promise<ApiResponse<ManagementPermission>> {
    return this.http.put(path`/${realm}/users-management-permissions`, data);
  }
}

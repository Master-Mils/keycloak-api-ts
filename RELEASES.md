# 2.0.0

Rewritten for Keycloak 24, 25 and 26 (tested up to 26.8.1). Requires Node.js 20 or newer.

## Breaking changes and migration

- **`baseUrl` has no `/auth`.** Use `https://sso.example.com` instead of `https://sso.example.com/auth`. Keep `/auth` only if your server runs with `--http-relative-path=/auth`.
- **HTTP errors no longer throw.**
  - Every method resolves to `ApiResponse<T>` with `success`, `status`, `statusText` and either `data` or `error`.
  - Replace `try/catch` around calls with `if (!response.success)`.
  - Network errors still reject.
  - Token failures throw `KeycloakAuthError` (with `status`, `error`, `errorDescription`).
- **`create` methods return the new id** (from the `Location` header) in `data`.
- **Authentication:**
  - `credentials.grantType` is honoured (`client_credentials`, `password`, `refresh_token`).
  - `realmName` defaults to `master`.
  - The `openid-client` dependency was removed.
  - Tokens renew from `expires_in` instead of a fixed 58 s timer.
  - Call `dispose()` to stop background renewal.
- **Types are generated from the Keycloak 26.8.1 OpenAPI spec.**
  - The names (`User`, `Client`, `Realm`...) are unchanged.
  - They mirror the current server: new fields such as `Realm.defaultRole` and `User.userProfileMetadata` are present. Deprecated fields (e.g. `defaultRoles`) are kept but ignored by recent servers.
  - Almost every field is optional.
  - `lib/types/server-settings.ts` was removed. Import `ServerSettings` from the package root.
- **Retry and throttling** apply only to the library's own axios instance. They no longer touch the global axios. Configure them with `retries` and `requestsPerSecond`.
- **`authentication.flows.executions.create(realm, flowAlias, provider)`** now posts to `/flows/{alias}/executions/execution`. It used to post to `/flows`, which was wrong.
  - `executions.get` returns a single execution.
  - Sub-flows use `createSubFlow`.
- **`userStorageProvider.list` / `listMappers`** query components by type, because the old endpoints do not exist in Keycloak.
- **`users.getRoleMappings`** returns `Mappings` instead of `string`.

## New

- `groups` module: CRUD, subgroups, count, members.
- `users`:
  - `listRealmRoleMappings`, `listCompositeRealmRoleMappings`, `addRealmRoleMapping`, `deleteRealmRoleMapping`.
  - `listGroups`, `addToGroup`, `removeFromGroup`.
  - `getProfile` / `updateProfile` (user profile config).
  - New query parameters: `q`, `idpAlias`, `idpUserId`, `emailVerified`, `briefRepresentation`.
- `roles.getById`, `roles.listUsers`; `authentication.flows.copy`.
- `clientScopes` module: CRUD, realm default/optional client scopes, scope mappings and protocol mappers.
- `identityProviders` module: CRUD, import config, export, reload keys, provider types, mappers, fine-grained permissions.
- `organizations` module (26+): CRUD, count, members, membership type, invitations, identity provider links, and `organizations.groups` with members and role mappings. Endpoints added after 26.0 are flagged in the docs.
- `clients`:
  - Secrets (including rotated), registration access token, service account user, certificates, installation.
  - Default/optional client scopes; evaluate scopes (example access/id tokens, userinfo, SAML response, protocol mappers, scope mappings).
  - Sessions and offline sessions, cluster nodes, push revocation, fine-grained permissions.
  - `scopeMappings`, `protocolMappers` and `authorization` (resource server, resources, scopes, policies, permissions, evaluation).
- `users.roleMappings` and `groups.roleMappings`: realm and client role mappings, including available and composite roles.
- Shared building blocks exported for custom owners: `RoleMappings`, `ScopeMappings`, `ProtocolMappers`.
- Admin API coverage grew from about 14% to about 60% of the 26.8.1 OpenAPI operations.
- Exports: `KeycloakSchemas` (all generated schemas), `KEYCLOAK_SPEC_VERSION`, `USER_STORAGE_PROVIDER_TYPE`, `LDAP_STORAGE_MAPPER_TYPE`.
- Unit tests (nock) and integration tests (Testcontainers) against Keycloak 24.0.5, 25.0.6 and 26.8.1, run in GitHub Actions.

# 0.0.1

- Axios exceptions aren't handled in this version.

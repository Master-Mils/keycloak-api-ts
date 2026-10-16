# Keycloak API TS

[![npm version](https://badge.fury.io/js/keycloak-api-ts.svg)](https://badge.fury.io/js/keycloak-api-ts)
[![CI](https://github.com/Master-Mils/keycloak-api-ts/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Master-Mils/keycloak-api-ts/actions/workflows/ci.yml)

## Introduction

**Keycloak API TS** is a TypeScript client for the Keycloak Admin REST API. It covers **100% of the Admin API**: all 415 operations of the official OpenAPI spec of Keycloak 26.8.1. It is checked against Keycloak 24, 25 and 26 on every change.

## Why this library

How it compares with the official [@keycloak/keycloak-admin-client](https://www.npmjs.com/package/@keycloak/keycloak-admin-client):

|                 | keycloak-api-ts                                                                                       | official admin client                            |
| --------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| HTTP errors     | Returned as values: `{ success: false, status, error }`                                               | Thrown as exceptions                             |
| Realm           | Passed on every call: `api.users.list('my-realm')`. This is safe for concurrent multi-tenant code.    | Global mutable state: `setConfig({ realmName })` |
| Tokens          | Requested lazily, cached, renewed before `expires_in`. A `401` triggers one retry with a fresh token. | You call `auth()` again yourself                 |
| Resilience      | Retry with backoff and a client-side rate limit, applied to its own axios instance                    | None built in                                    |
| Types           | Generated from the official OpenAPI spec, with the raw schemas exported as `KeycloakSchemas`          | Hand-written                                     |
| Modules         | CommonJS **and** ESM                                                                                  | ESM only                                         |
| API coverage    | 100% of the 26.8.1 spec, including deprecated and preview endpoints                                   | Partial                                          |
| Server versions | Integration-tested against real 24.0.5, 25.0.6 and 26.8.1 servers in CI                               | Tracks the latest server                         |

The library also includes fixes that only show up against a real server:

- Authorization policies are created on `/policy/{type}`, because the generic endpoint in the spec cannot parse provider fields.
- Text and YAML bodies get the correct content type (localization texts, credential labels, workflows).
- Keystore downloads come back as `Buffer`s.
- Certificate uploads are sent as multipart.
- Array filters are sent as repeated query parameters (`type=LOGIN&type=LOGOUT`).
- `create` methods return the new id taken from the `Location` header.

## Compatibility

| keycloak-api-ts | Keycloak                  | Node.js |
| --------------- | ------------------------- | ------- |
| 2.x             | 24.x, 25.x, 26.x          | >= 20   |
| 1.x             | legacy (WildFly, `/auth`) | >= 14   |

Version 2.x is tested on every change against Keycloak **24.0.5**, **25.0.6** and **26.8.1**. Its types are generated from the official OpenAPI spec of Keycloak 26.8.1. Fields added after 24 are optional, so the same types work with older servers.

## Installation

```bash
npm install keycloak-api-ts
```

## Usage

```typescript
import KeycloakAPI from 'keycloak-api-ts';

const api = new KeycloakAPI({
  baseUrl: 'https://sso.example.com', // no "/auth" since Keycloak 17
  realmName: 'master', // realm used to authenticate (default: master)
  credentials: {
    grantType: 'client_credentials',
    clientId: 'admin-service',
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
  },
});

const users = await api.users.list('my-realm', { q: 'department:R&D', max: 50 });
if (users.success) {
  console.log(users.data.map((u) => u.username));
} else {
  console.error(users.status, users.error);
}

const created = await api.users.create('my-realm', { username: 'jdoe', enabled: true });
if (created.success) {
  console.log('new user id', created.data); // taken from the Location header
}
```

The `password` grant (`username`, `password`, optional `totp`) and the `refresh_token` grant (`refreshToken`) are also supported. Tokens are requested lazily, cached, and renewed before `expires_in`, using the refresh token when there is one. Pass `true` as the second constructor argument to renew in the background, and call `api.dispose()` when you are done.

### Responses

Every method resolves to an `ApiResponse<T>`:

```typescript
type ApiResponse<T> =
  | { success: true; status: number; statusText: string; data: T }
  | { success: false; status: number; statusText: string; error: unknown };
```

- 4xx and 5xx responses are returned with `success: false`. Only network failures reject.
- A `KeycloakAuthError` is thrown when a token cannot be obtained.
- `create` methods return the new id in `data`.
- A `401` invalidates the cached token and retries the request once.

### Options

| Option              | Default  | Description                                                                                                 |
| ------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `baseUrl`           | —        | Server root URL. Append `/auth` only if the server uses `--http-relative-path=/auth`.                       |
| `realmName`         | `master` | Realm used to obtain the token.                                                                             |
| `credentials`       | —        | `{ grantType, clientId, clientSecret?, username?, password?, totp?, refreshToken?, scope?, offlineToken? }` |
| `requestConfig`     | —        | Extra axios options (timeout, proxy, `httpsAgent`...).                                                      |
| `retries`           | `3`      | Retries with exponential backoff for network errors, 408, 429 and 5xx on idempotent requests.               |
| `requestsPerSecond` | `10`     | Client-side rate limit; `0` disables it.                                                                    |

### Available modules

| Module                                              | Highlights                                                                                                                                                                                                                                                                 |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `realms`                                            | CRUD, partial import/export, events and admin events (+ config), keys, localization, default groups, client policies/profiles, client types, sessions (logout all, delete session), push revocation, SMTP test, client description converter, users management permissions |
| `users`                                             | CRUD, count, search, credentials (reset, labels, order, disable types), required-action and verify e-mails, sessions and offline sessions, consents, federated identities, impersonation, logout, groups, user profile config and metadata, unmanaged attributes           |
| `users.roleMappings` / `groups.roleMappings`        | realm and client role mappings: list, add, remove, available, composite                                                                                                                                                                                                    |
| `attackDetection`                                   | brute-force status of a user, clear one or all                                                                                                                                                                                                                             |
| `clients`                                           | CRUD, search, secrets and rotation, service account, installation, certificates (get, generate, download keystore, upload), client scopes, evaluate scopes (example tokens), sessions, cluster nodes, fine-grained permissions                                             |
| `clients.roles`                                     | client roles: CRUD, users, groups, composites, permissions                                                                                                                                                                                                                 |
| `clients.scopeMappings` / `clients.protocolMappers` | scope mappings and protocol mappers of a client                                                                                                                                                                                                                            |
| `clients.authorization`                             | authorization services: resource server, resources, scopes, policies, permissions, evaluation, export                                                                                                                                                                      |
| `clientScopes`                                      | CRUD, realm default/optional scopes, `scopeMappings`, `protocolMappers`, legacy `templates` (`/client-templates`)                                                                                                                                                          |
| `clientRegistration`                                | initial access tokens, registration policy providers                                                                                                                                                                                                                       |
| `roles`                                             | realm roles: CRUD, users, groups, composites, permissions. `roles.byId` addresses roles by id                                                                                                                                                                              |
| `groups`                                            | CRUD, subgroups and children, group by path, count, members, fine-grained permissions                                                                                                                                                                                      |
| `identityProviders`                                 | CRUD, import config, export, reload keys, upload certificate, provider types, mappers, permissions                                                                                                                                                                         |
| `organizations`                                     | CRUD, count, members, membership type, invitations, identity provider links (26+, see notes)                                                                                                                                                                               |
| `organizations.groups`                              | organization groups, members and role mappings (26.7+)                                                                                                                                                                                                                     |
| `components`                                        | CRUD with filters, sub-component types                                                                                                                                                                                                                                     |
| `userStorageProvider`                               | providers and mappers, sync users and mappers, unlink, remove imported users                                                                                                                                                                                               |
| `authentication`                                    | authenticator, form and client providers, authenticator configs, config descriptions                                                                                                                                                                                       |
| `authentication.flows` / `.executions`              | flows CRUD and copy; executions and sub-flows, configs, priority                                                                                                                                                                                                           |
| `authentication.requiredActions`                    | register, update, priority, config (25+)                                                                                                                                                                                                                                   |
| `workflows`                                         | workflows (26.4+ preview): CRUD as JSON or YAML, activate/deactivate, scheduled, migrate                                                                                                                                                                                   |

All Keycloak representations are exported as types (`User`, `Client`, `Realm`, `Role`, `Group`, `UserProfileConfig`, `AdminEvent`, `Workflow`...), and the raw generated schemas are available as `KeycloakSchemas`.

## Behaviour changes in Keycloak 24–26.8

- **User profile (24+)** is always enabled. Attributes that are not declared in the profile are dropped unless the realm's `unmanagedAttributePolicy` allows them. Use `api.users.getProfile` / `updateProfile` to declare them. Since 26.3 the users API also filters attributes by the profile.
- **26.8:**
  - Client `secret` is masked for callers without `manage-clients`.
  - Role mapping endpoints return an empty list instead of `403` when the caller can't see them.
  - `IdentityProvider.organizationId` was replaced by organization links.
  - The client certificate `generate`/`download` endpoints are deprecated by Keycloak. They are still wrapped and marked `@deprecated`.
- **Organizations (26+)** must be enabled on the realm (`organizationsEnabled: true`). Some endpoints are newer than 26.0:
  - `count`: 26.3+.
  - Invitations list/get/delete/resend: 26.5+.
  - Organization groups and member groups: 26.7+.
  - `updateMembershipType`, `updateIdentityProviderLink` and the `client_id` option of invitations: 26.8+.
- **Authorization policies** are created and updated on `/policy/{type}` (the OpenAPI spec only lists the generic `/policy`, which the server cannot parse), so `type` is required in `createPolicy`, `createPermission` and `updatePolicy`.
- **Previews:** `workflows` and `client-types` need their features enabled on the server (`--features=workflows,client-types`).
- **No `/auth` path** since Keycloak 17 (Quarkus distribution).

## Development

```bash
npm install
npm run lint
npm test                  # unit tests (no server needed)
npm run test:integration  # starts Keycloak in Docker via Testcontainers
KEYCLOAK_VERSION=24.0.5 npm run test:integration
npm run gen:types         # regenerate lib/generated from the OpenAPI spec (KEYCLOAK_VERSION=...)
```

## Contributing

Contributions are welcome. Please open an issue first for major changes. Then fork the repository, create a feature branch, and open a pull request with tests.

## Roadmap

- [x] 100% of the Admin REST API (Keycloak 26.8.1 OpenAPI spec).
- [ ] Admin API v2, once it is stable.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

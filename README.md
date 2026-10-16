# Keycloak API TS

[![npm version](https://badge.fury.io/js/keycloak-api-ts.svg)](https://badge.fury.io/js/keycloak-api-ts)
[![CI](https://github.com/Master-Mils/keycloak-api-ts/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Master-Mils/keycloak-api-ts/actions/workflows/ci.yml)

## Introduction

**Keycloak API TS** is a lightweight TypeScript client for the Keycloak Admin REST API. It covers calls that the official [@keycloak/keycloak-admin-client](https://www.npmjs.com/package/@keycloak/keycloak-admin-client) does not expose conveniently (user storage sync, authentication executions, etc.), works in CommonJS and ESM projects, and never throws on HTTP errors.

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

| Module                            | Highlights                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| `realms`                          | import, list, get, update, delete                                                          |
| `users`                           | CRUD, count, search (`q`, `idpAlias`...), realm role mappings, groups, user profile config |
| `clients`                         | CRUD, search                                                                               |
| `roles`                           | CRUD, get by id, users with a role                                                         |
| `groups`                          | CRUD, subgroups, count, members                                                            |
| `components`                      | CRUD with `name` / `parent` / `type` filters                                               |
| `userStorageProvider`             | list providers and mappers, sync users, sync mappers, unlink, remove imported users        |
| `authentication.flows`            | CRUD, copy                                                                                 |
| `authentication.flows.executions` | list, get, add execution or sub-flow, update requirement/priority, delete                  |

All Keycloak representations are exported as types (`User`, `Client`, `Realm`, `Role`, `Group`, `UserProfileConfig`...), and the raw generated schemas are available as `KeycloakSchemas`.

## Behaviour changes in Keycloak 24–26.8

- **User profile (24+)** is always enabled. Attributes that are not declared in the profile are dropped unless the realm's `unmanagedAttributePolicy` allows them. Use `api.users.getProfile` / `updateProfile` to declare them. Since 26.3 the users API also filters attributes by the profile.
- **26.8:**
  - Client `secret` is masked for callers without `manage-clients`.
  - Role mapping endpoints return an empty list instead of `403` when the caller can't see them.
  - `IdentityProvider.organizationId` was replaced by organization links.
  - The client certificate `generate`/`download` endpoints are deprecated, so this library does not wrap them.
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

- [ ] Organizations API (Keycloak 26+).
- [ ] Admin API v2 when it becomes stable.
- [ ] Client role mappings and client scopes.
- [ ] Identity providers and their mappers.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

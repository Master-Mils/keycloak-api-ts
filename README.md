
# Keycloak API TS

[![npm version](https://badge.fury.io/js/keycloak-api-ts.svg)](https://badge.fury.io/js/keycloak-api-ts)
[![Build Status](https://travis-ci.com/Master-Mils/keycloak-api-ts.svg?branch=main)](https://travis-ci.com/Master-Mils/keycloak-api-ts)

## Introduction

**Keycloak API TS** is a TypeScript client library for the Keycloak Admin API. This library aims to provide support for API calls not yet implemented by the official [keycloak-admin-client](https://www.npmjs.com/package/@keycloak/keycloak-admin-client). Our goal is to offer a lightweight, fast, and developer-friendly experience.

## Features

- Implements additional Keycloak Admin API methods.
- Lightweight and efficient.
- Written in TypeScript for robust type-checking and improved developer experience.
- Easy to extend and contribute to.

## Installation

To install the library, use npm or yarn:

```bash
npm install keycloak-api-ts
```

or

```bash
yarn add keycloak-api-ts
```

## Usage

Here’s a basic example of how to use the library:

```typescript
import KeycloakAdmin from 'keycloak-api-ts';

const keycloakAdmin = new KeycloakAdmin({
  baseUrl: 'http://localhost:8080/auth',
  realmName: 'your-realm',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
});

// Example usage
(async () => {
  const users = await keycloakAdmin.getUsers();
  console.log(users);
})();
```

## API Documentation

Detailed API documentation is available [here](https://github.com/Master-Mils/keycloak-api-ts/wiki).

## Contributing

We welcome contributions from the community. If you would like to contribute, please fork the repository and create a pull request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository.
2. Create your feature branch: `git checkout -b feature/your-feature-name`.
3. Commit your changes: `git commit -m 'Add some feature'`.
4. Push to the branch: `git push origin feature/your-feature-name`.
5. Open a pull request.

## Roadmap

- [ ] Implement additional Keycloak Admin API methods.
- [ ] Add more comprehensive test coverage.
- [ ] Improve documentation with detailed examples and use cases.
- [ ] Optimize performance for large-scale Keycloak deployments.

## Feedback and Support

This library is still under active development. If you have any specific methods you need or any feedback, please reach out. You can open an issue on GitHub.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

import { expect } from 'chai';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

import KeycloakAPI, { ApiResponse, USER_STORAGE_PROVIDER_TYPE } from '../../lib';

const KEYCLOAK_VERSION = process.env.KEYCLOAK_VERSION || '26.8.1';
const REALM = 'it-realm';

/** Unwraps a successful response, failing the test with the server error otherwise. */
function ok<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    expect.fail(`HTTP ${response.status} ${response.statusText}: ${JSON.stringify(response.error)}`);
  }
  return response.data;
}

describe(`Keycloak ${KEYCLOAK_VERSION} integration`, function () {
  this.timeout(360_000);

  let container: StartedTestContainer;
  let baseUrl: string;
  let api: KeycloakAPI;

  before(async () => {
    container = await new GenericContainer(`quay.io/keycloak/keycloak:${KEYCLOAK_VERSION}`)
      .withEnvironment({
        KC_BOOTSTRAP_ADMIN_USERNAME: 'admin',
        KC_BOOTSTRAP_ADMIN_PASSWORD: 'admin',
        // Keycloak 24/25
        KEYCLOAK_ADMIN: 'admin',
        KEYCLOAK_ADMIN_PASSWORD: 'admin',
      })
      .withCommand(['start-dev'])
      .withExposedPorts(8080)
      .withWaitStrategy(Wait.forHttp('/realms/master', 8080).forStatusCode(200))
      .withStartupTimeout(300_000)
      .start();
    baseUrl = `http://${container.getHost()}:${container.getMappedPort(8080)}`;

    api = new KeycloakAPI({
      baseUrl,
      credentials: { grantType: 'password', clientId: 'admin-cli', username: 'admin', password: 'admin' },
      requestsPerSecond: 0,
    });

    ok(
      await api.realms.import({
        realm: REALM,
        enabled: true,
        accessTokenLifespan: 5,
        clients: [
          {
            clientId: 'svc',
            secret: 'svc-secret',
            publicClient: false,
            serviceAccountsEnabled: true,
            standardFlowEnabled: false,
          },
        ],
        users: [
          {
            username: 'service-account-svc',
            enabled: true,
            serviceAccountClientId: 'svc',
            clientRoles: { 'realm-management': ['view-users', 'manage-users'] },
          },
        ],
      }),
    );
  });

  after(async () => {
    if (api) {
      await api.realms.delete(REALM).catch(() => undefined);
      api.dispose();
    }
    await container?.stop();
  });

  describe('realms', () => {
    it('gets, lists and updates the realm', async () => {
      expect(ok(await api.realms.get(REALM)).accessTokenLifespan).to.equal(5);
      expect(ok(await api.realms.list()).map((r) => r.realm)).to.include(REALM);

      ok(await api.realms.update(REALM, { displayName: 'Integration' }));
      expect(ok(await api.realms.get(REALM)).displayName).to.equal('Integration');
    });

    it('returns success false for a missing realm', async () => {
      const response = await api.realms.get('does-not-exist');
      expect(response.success).to.equal(false);
      expect(response.status).to.equal(404);
    });
  });

  describe('users, roles and groups', () => {
    let userId: string;
    let groupId: string;

    it('creates, finds and updates a user', async () => {
      userId = ok(
        await api.users.create(REALM, {
          username: 'jdoe',
          email: 'jdoe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          enabled: true,
        }),
      );
      expect(userId).to.be.a('string').with.length.greaterThan(0);

      const found = ok(await api.users.list(REALM, { username: 'jdoe', exact: true }));
      expect(found.map((u) => u.id)).to.deep.equal([userId]);
      expect(ok(await api.users.count(REALM, { search: 'jdoe' }))).to.equal(1);

      ok(await api.users.update(REALM, userId, { firstName: 'Johnny' }));
      expect(ok(await api.users.get(REALM, userId)).firstName).to.equal('Johnny');
    });

    it('creates a realm role and maps it to the user', async () => {
      ok(await api.roles.create(REALM, { name: 'auditor', description: 'Reads things' }));
      const role = ok(await api.roles.get(REALM, 'auditor'));
      expect(ok(await api.roles.getById(REALM, role.id!)).name).to.equal('auditor');

      ok(await api.users.addRealmRoleMapping(REALM, userId, [role]));
      expect(ok(await api.users.listRealmRoleMappings(REALM, userId)).map((r) => r.name)).to.include('auditor');
      expect(ok(await api.users.getRoleMappings(REALM, userId)).realmMappings?.map((r) => r.name)).to.include(
        'auditor',
      );
      expect(ok(await api.roles.listUsers(REALM, 'auditor')).map((u) => u.id)).to.include(userId);

      ok(await api.users.deleteRealmRoleMapping(REALM, userId, [role]));
      expect(ok(await api.users.listRealmRoleMappings(REALM, userId)).map((r) => r.name)).not.to.include('auditor');

      ok(await api.roles.update(REALM, 'auditor', { name: 'auditor', description: 'Updated' }));
      expect(ok(await api.roles.get(REALM, 'auditor')).description).to.equal('Updated');
      ok(await api.roles.delete(REALM, 'auditor'));
    });

    it('manages groups and membership', async () => {
      groupId = ok(await api.groups.create(REALM, { name: 'engineering' }));
      const childId = ok(await api.groups.createChild(REALM, groupId, { name: 'platform' }));
      expect(childId).to.be.a('string');
      expect(ok(await api.groups.count(REALM, { top: true })).count).to.equal(1);

      ok(await api.users.addToGroup(REALM, userId, groupId));
      expect(ok(await api.users.listGroups(REALM, userId)).map((g) => g.id)).to.deep.equal([groupId]);
      expect(ok(await api.groups.listMembers(REALM, groupId)).map((u) => u.id)).to.deep.equal([userId]);

      ok(await api.users.removeFromGroup(REALM, userId, groupId));
      ok(await api.groups.update(REALM, groupId, { name: 'eng' }));
      expect(ok(await api.groups.get(REALM, groupId)).name).to.equal('eng');
      ok(await api.groups.delete(REALM, groupId));
    });

    it('stores attributes declared in the user profile', async () => {
      const profile = ok(await api.users.getProfile(REALM));
      profile.attributes = [
        ...(profile.attributes ?? []),
        { name: 'department', displayName: 'Department', permissions: { view: ['admin'], edit: ['admin'] } },
      ];
      ok(await api.users.updateProfile(REALM, profile));

      ok(await api.users.update(REALM, userId, { attributes: { department: ['R&D'] } }));
      const user = ok(await api.users.get(REALM, userId));
      expect(user.attributes?.department).to.deep.equal(['R&D']);
      expect(ok(await api.users.list(REALM, { q: 'department:R&D' })).map((u) => u.id)).to.deep.equal([userId]);
    });

    it('deletes the user', async () => {
      ok(await api.users.delete(REALM, userId));
      expect((await api.users.get(REALM, userId)).status).to.equal(404);
    });
  });

  describe('clients', () => {
    it('creates, lists, updates and deletes a client', async () => {
      const id = ok(await api.clients.create(REALM, { clientId: 'web-app', publicClient: true }));
      expect(ok(await api.clients.list(REALM, { clientId: 'web-app' })).map((c) => c.id)).to.deep.equal([id]);

      ok(await api.clients.update(REALM, id, { clientId: 'web-app', description: 'SPA' }));
      expect(ok(await api.clients.get(REALM, id)).description).to.equal('SPA');

      ok(await api.clients.delete(REALM, id));
      expect((await api.clients.get(REALM, id)).status).to.equal(404);
    });
  });

  describe('authentication flows', () => {
    it('creates a flow, adds executions and copies it', async () => {
      const flows = api.authentication.flows;
      const flowId = ok(
        await flows.create(REALM, {
          alias: 'custom browser',
          providerId: 'basic-flow',
          topLevel: true,
          builtIn: false,
        }),
      );

      const executionId = ok(await flows.executions.create(REALM, 'custom browser', 'auth-cookie'));
      ok(
        await flows.executions.createSubFlow(REALM, 'custom browser', {
          alias: 'custom forms',
          type: 'basic-flow',
          provider: 'registration-page-form',
          description: 'forms',
        }),
      );

      const executions = ok(await flows.executions.list(REALM, 'custom browser'));
      expect(executions).to.have.length(2);
      const cookie = executions.find((e) => e.providerId === 'auth-cookie')!;
      expect(cookie.id).to.equal(executionId);
      expect(ok(await flows.executions.get(REALM, executionId)).authenticator).to.equal('auth-cookie');

      ok(await flows.executions.update(REALM, 'custom browser', { ...cookie, requirement: 'ALTERNATIVE' }));
      const updated = ok(await flows.executions.list(REALM, 'custom browser'));
      expect(updated.find((e) => e.id === executionId)!.requirement).to.equal('ALTERNATIVE');

      ok(await flows.copy(REALM, 'custom browser', 'custom browser copy'));
      const aliases = ok(await flows.list(REALM)).map((f) => f.alias);
      expect(aliases).to.include.members(['custom browser', 'custom browser copy']);

      ok(await flows.executions.delete(REALM, executionId));
      ok(await flows.update(REALM, flowId, { ...ok(await flows.get(REALM, flowId)), description: 'Edited' }));
      expect(ok(await flows.get(REALM, flowId)).description).to.equal('Edited');
      ok(await flows.delete(REALM, flowId));
    });
  });

  describe('components and user storage', () => {
    it('lists components and user storage providers', async () => {
      const keys = ok(await api.components.list(REALM, { type: 'org.keycloak.keys.KeyProvider' }));
      expect(keys.length).to.be.greaterThan(0);
      expect(ok(await api.components.get(REALM, keys[0].id!)).providerType).to.equal('org.keycloak.keys.KeyProvider');

      const realmId = ok(await api.realms.get(REALM)).id!;
      const providerId = ok(
        await api.components.create(REALM, {
          name: 'kerberos',
          providerId: 'kerberos',
          providerType: USER_STORAGE_PROVIDER_TYPE,
          parentId: realmId,
          config: {
            kerberosRealm: ['EXAMPLE.COM'],
            serverPrincipal: ['HTTP/sso.example.com@EXAMPLE.COM'],
            keyTab: ['/etc/krb5.keytab'],
            enabled: ['false'],
          },
        }),
      );

      const providers = ok(await api.userStorageProvider.list(REALM));
      expect(providers.map((p) => p.id)).to.deep.equal([providerId]);
      expect(ok(await api.userStorageProvider.getName(REALM, providerId)).name).to.equal('kerberos');

      ok(await api.components.delete(REALM, providerId));
      expect(ok(await api.userStorageProvider.list(REALM))).to.deep.equal([]);
    });
  });

  describe('token lifecycle', () => {
    it('renews a client_credentials token after it expires', async () => {
      const service = new KeycloakAPI({
        baseUrl,
        realmName: REALM,
        credentials: { grantType: 'client_credentials', clientId: 'svc', clientSecret: 'svc-secret' },
        requestsPerSecond: 0,
      });
      try {
        const first = await service.getToken();
        expect(first.expiresIn).to.equal(5);
        ok(await service.users.count(REALM));

        await new Promise((resolve) => setTimeout(resolve, 4_500));

        ok(await service.users.count(REALM));
        const second = await service.getToken();
        expect(second.accessToken).not.to.equal(first.accessToken);
      } finally {
        service.dispose();
      }
    });
  });
});

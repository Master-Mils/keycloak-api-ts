import { expect } from 'chai';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

import KeycloakAPI, { ApiResponse, USER_STORAGE_PROVIDER_TYPE } from '../../lib';

const KEYCLOAK_VERSION = process.env.KEYCLOAK_VERSION || '26.8.1';
const REALM = 'it-realm';

/** True when the Keycloak under test is at least `version` (e.g. `26.3`). */
function versionAtLeast(version: string): boolean {
  const actual = KEYCLOAK_VERSION.split('.').map(Number);
  const wanted = version.split('.').map(Number);
  for (let i = 0; i < wanted.length; i++) {
    if ((actual[i] ?? 0) !== wanted[i]) {
      return (actual[i] ?? 0) > wanted[i];
    }
  }
  return true;
}

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

  describe('client scopes, mappers and mappings', () => {
    let userId: string;
    let clientId: string;
    let realmManagementId: string;

    before(async () => {
      userId = ok(await api.users.create(REALM, { username: 'alice', email: 'alice@acme.com', enabled: true }));
      clientId = ok(
        await api.clients.create(REALM, {
          clientId: 'portal',
          publicClient: false,
          secret: 'portal-secret',
          serviceAccountsEnabled: true,
          fullScopeAllowed: false,
        }),
      );
      realmManagementId = ok(await api.clients.list(REALM, { clientId: 'realm-management' }))[0].id!;
    });

    it('manages client scopes with protocol mappers and scope mappings', async () => {
      const scopeId = ok(await api.clientScopes.create(REALM, { name: 'billing', protocol: 'openid-connect' }));
      expect(ok(await api.clientScopes.list(REALM)).map((s) => s.id)).to.include(scopeId);

      const mappers = api.clientScopes.protocolMappers;
      const mapperId = ok(
        await mappers.create(REALM, scopeId, {
          name: 'tier',
          protocol: 'openid-connect',
          protocolMapper: 'oidc-hardcoded-claim-mapper',
          config: { 'claim.name': 'tier', 'claim.value': 'gold', 'access.token.claim': 'true' },
        }),
      );
      expect(ok(await mappers.list(REALM, scopeId)).map((m) => m.id)).to.deep.equal([mapperId]);
      const mapper = ok(await mappers.get(REALM, scopeId, mapperId));
      ok(
        await mappers.update(REALM, scopeId, mapperId, {
          ...mapper,
          config: { ...mapper.config, 'claim.value': 'platinum' },
        }),
      );
      expect(ok(await mappers.listByProtocol(REALM, scopeId, 'openid-connect'))[0].config?.['claim.value']).to.equal(
        'platinum',
      );

      ok(await api.roles.create(REALM, { name: 'billing-reader' }));
      const role = ok(await api.roles.get(REALM, 'billing-reader'));
      ok(await api.clientScopes.scopeMappings.addRealm(REALM, scopeId, [role]));
      expect(ok(await api.clientScopes.scopeMappings.listRealm(REALM, scopeId)).map((r) => r.name)).to.deep.equal([
        'billing-reader',
      ]);
      expect(ok(await api.clientScopes.scopeMappings.get(REALM, scopeId)).realmMappings).to.have.length(1);

      ok(await api.clients.addClientScope(REALM, clientId, 'optional', scopeId));
      expect(ok(await api.clients.listClientScopes(REALM, clientId, 'optional')).map((s) => s.id)).to.include(scopeId);

      // A client scope with role scope mappings only applies to users holding one of those roles
      ok(await api.users.roleMappings.addRealm(REALM, userId, [role]));
      const evaluated = ok(await api.clients.evaluateProtocolMappers(REALM, clientId, { scope: 'billing' }));
      expect(evaluated.map((m) => m.mapperName)).to.include('tier');
      const token = ok(
        await api.clients.generateExampleAccessToken(REALM, clientId, { scope: 'billing', userId }),
      ) as Record<string, unknown>;
      expect(token.tier).to.equal('platinum');
      const granted = ok(await api.clients.evaluateScopeMappings(REALM, clientId, REALM, true, { scope: 'billing' }));
      expect(granted.map((r) => r.name)).to.include('billing-reader');

      ok(await api.clients.removeClientScope(REALM, clientId, 'optional', scopeId));
      ok(await api.clientScopes.scopeMappings.removeRealm(REALM, scopeId, [role]));
      ok(await mappers.delete(REALM, scopeId, mapperId));
      ok(await api.clientScopes.update(REALM, scopeId, { name: 'billing', description: 'Billing claims' }));
      expect(ok(await api.clientScopes.get(REALM, scopeId)).description).to.equal('Billing claims');

      ok(await api.clientScopes.addRealmDefault(REALM, 'optional', scopeId));
      expect(ok(await api.clientScopes.listRealmDefaults(REALM, 'optional')).map((s) => s.id)).to.include(scopeId);
      ok(await api.clientScopes.removeRealmDefault(REALM, 'optional', scopeId));
      ok(await api.clientScopes.delete(REALM, scopeId));
      ok(await api.roles.delete(REALM, 'billing-reader'));
    });

    it('manages client role mappings of users and groups', async () => {
      const available = ok(await api.users.roleMappings.listAvailableClient(REALM, userId, realmManagementId));
      const viewClients = available.find((r) => r.name === 'view-clients')!;
      expect(viewClients).to.not.equal(undefined);

      ok(await api.users.roleMappings.addClient(REALM, userId, realmManagementId, [viewClients]));
      expect(
        ok(await api.users.roleMappings.listClient(REALM, userId, realmManagementId)).map((r) => r.name),
      ).to.deep.equal(['view-clients']);
      expect(ok(await api.users.roleMappings.get(REALM, userId)).clientMappings?.['realm-management']).to.not.equal(
        undefined,
      );
      ok(await api.users.roleMappings.removeClient(REALM, userId, realmManagementId, [viewClients]));
      expect(ok(await api.users.roleMappings.listClient(REALM, userId, realmManagementId))).to.have.length(0);

      const groupId = ok(await api.groups.create(REALM, { name: 'ops' }));
      ok(await api.groups.roleMappings.addClient(REALM, groupId, realmManagementId, [viewClients]));
      const composite = ok(await api.groups.roleMappings.listCompositeClient(REALM, groupId, realmManagementId));
      // view-clients is a composite that includes query-clients
      expect(composite.map((r) => r.name)).to.include.members(['view-clients', 'query-clients']);
      const offline = ok(await api.groups.roleMappings.listAvailableRealm(REALM, groupId)).find(
        (r) => r.name === 'offline_access',
      )!;
      ok(await api.groups.roleMappings.addRealm(REALM, groupId, [offline]));
      expect(ok(await api.groups.roleMappings.listRealm(REALM, groupId)).map((r) => r.name)).to.deep.equal([
        'offline_access',
      ]);
      ok(await api.groups.delete(REALM, groupId));
    });

    it('manages client scope mappings', async () => {
      const roles = ok(await api.clients.scopeMappings.listAvailableClient(REALM, clientId, realmManagementId));
      const viewUsers = roles.find((r) => r.name === 'view-users')!;
      ok(await api.clients.scopeMappings.addClient(REALM, clientId, realmManagementId, [viewUsers]));
      expect(
        ok(await api.clients.scopeMappings.listClient(REALM, clientId, realmManagementId)).map((r) => r.name),
      ).to.deep.equal(['view-users']);
      expect(
        ok(await api.clients.scopeMappings.listCompositeClient(REALM, clientId, realmManagementId)).map((r) => r.name),
      ).to.include('query-users');
      ok(await api.clients.scopeMappings.removeClient(REALM, clientId, realmManagementId, [viewUsers]));
      expect(ok(await api.clients.scopeMappings.listClient(REALM, clientId, realmManagementId))).to.have.length(0);
    });

    it('reads and rotates client credentials and sessions', async () => {
      expect(ok(await api.clients.getSecret(REALM, clientId)).value).to.equal('portal-secret');
      const regenerated = ok(await api.clients.regenerateSecret(REALM, clientId));
      expect(regenerated.value).to.be.a('string').and.not.equal('portal-secret');

      expect(ok(await api.clients.getServiceAccountUser(REALM, clientId)).username).to.equal('service-account-portal');
      expect(ok(await api.clients.getSessionCount(REALM, clientId)).count).to.equal(0);
      expect(ok(await api.clients.getOfflineSessionCount(REALM, clientId)).count).to.equal(0);
      expect(ok(await api.clients.listSessions(REALM, clientId))).to.deep.equal([]);
      expect(ok(await api.clients.listOfflineSessions(REALM, clientId))).to.deep.equal([]);

      const installation = ok(
        await api.clients.getInstallation<Record<string, unknown>>(REALM, clientId, 'keycloak-oidc-keycloak-json'),
      );
      expect(installation.resource).to.equal('portal');
      expect(ok(await api.clients.regenerateRegistrationAccessToken(REALM, clientId)).registrationAccessToken).to.be.a(
        'string',
      );
      expect(ok(await api.clients.getCertificate(REALM, clientId, 'jwt.credential'))).to.be.an('object');

      ok(await api.clients.registerNode(REALM, clientId, '10.0.0.1'));
      expect(ok(await api.clients.get(REALM, clientId)).registeredNodes).to.have.property('10.0.0.1');
      ok(await api.clients.unregisterNode(REALM, clientId, '10.0.0.1'));
    });

    it('manages authorization resources, scopes, policies and permissions', async () => {
      const authz = api.clients.authorization;
      const rsId = ok(
        await api.clients.create(REALM, {
          clientId: 'docs-api',
          publicClient: false,
          serviceAccountsEnabled: true,
          authorizationServicesEnabled: true,
        }),
      );
      expect(ok(await authz.getResourceServer(REALM, rsId)).clientId).to.equal(rsId);

      const scope = ok(await authz.createScope(REALM, rsId, { name: 'docs:read' }));
      expect(scope.id).to.be.a('string');
      const resource = ok(
        await authz.createResource(REALM, rsId, {
          name: 'documents',
          uris: ['/docs/*'],
          scopes: [{ name: 'docs:read' }],
          attributes: { sensitivity: ['high'] },
        }),
      );
      expect(resource._id).to.be.a('string');
      expect(ok(await authz.findResource(REALM, rsId, 'documents'))?._id).to.equal(resource._id);
      expect(ok(await authz.listResourceScopes(REALM, rsId, resource._id!)).map((s) => s.name)).to.deep.equal([
        'docs:read',
      ]);
      expect(ok(await authz.getResourceAttributes(REALM, rsId, resource._id!)).sensitivity).to.deep.equal(['high']);
      expect(ok(await authz.listScopeResources(REALM, rsId, scope.id!)).map((r) => r.name)).to.deep.equal([
        'documents',
      ]);

      const policy = ok(
        await authz.createPolicy(REALM, rsId, { type: 'client', name: 'only portal', clients: [clientId] }),
      );
      expect(policy.id).to.be.a('string');
      expect(ok(await authz.findPolicy(REALM, rsId, 'only portal'))?.id).to.equal(policy.id);
      expect(ok(await authz.listPolicyProviders(REALM, rsId)).map((p) => p.type)).to.include('client');

      const permission = ok(
        await authz.createPermission(REALM, rsId, {
          type: 'resource',
          name: 'read documents',
          resources: [resource._id!],
          policies: [policy.id!],
        }),
      );
      expect(ok(await authz.listPermissions(REALM, rsId, { name: 'read documents' })).map((p) => p.id)).to.deep.equal([
        permission.id,
      ]);
      expect(ok(await authz.listResourcePermissions(REALM, rsId, resource._id!)).map((p) => p.name)).to.include(
        'read documents',
      );

      const evaluation = ok(
        await authz.evaluate(REALM, rsId, {
          userId: ok(await api.clients.getServiceAccountUser(REALM, clientId)).id,
          clientId,
          resources: [{ _id: resource._id }],
          context: {},
        }),
      );
      expect(evaluation.status).to.equal('PERMIT');

      const exported = ok(await authz.exportSettings(REALM, rsId));
      expect(exported.resources?.map((r) => r.name)).to.include('documents');

      ok(await authz.deletePolicy(REALM, rsId, permission.id!));
      ok(await authz.deletePolicy(REALM, rsId, policy.id!));
      expect(ok(await authz.findPolicy(REALM, rsId, 'only portal'))).to.equal(undefined);
      ok(await authz.updateResource(REALM, rsId, resource._id!, { ...resource, displayName: 'Documents' }));
      expect(ok(await authz.getResource(REALM, rsId, resource._id!)).displayName).to.equal('Documents');
      ok(await authz.deleteResource(REALM, rsId, resource._id!));
      ok(await authz.updateScope(REALM, rsId, scope.id!, { ...scope, displayName: 'Read' }));
      expect(ok(await authz.getScope(REALM, rsId, scope.id!)).displayName).to.equal('Read');
      ok(await authz.deleteScope(REALM, rsId, scope.id!));
      ok(await api.clients.delete(REALM, rsId));
    });
  });

  describe('identity providers', () => {
    it('manages identity providers and their mappers', async () => {
      const idps = api.identityProviders;
      const alias = ok(
        await idps.create(REALM, {
          alias: 'corp',
          providerId: 'oidc',
          enabled: true,
          config: {
            authorizationUrl: 'https://idp.example.com/auth',
            tokenUrl: 'https://idp.example.com/token',
            clientId: 'kc',
            clientSecret: 'secret',
            clientAuthMethod: 'client_secret_post',
          },
        }),
      );
      expect(alias).to.equal('corp');
      expect(ok(await idps.list(REALM)).map((i) => i.alias)).to.deep.equal(['corp']);
      ok(await idps.update(REALM, 'corp', { ...ok(await idps.get(REALM, 'corp')), displayName: 'Corporate' }));
      expect(ok(await idps.get(REALM, 'corp')).displayName).to.equal('Corporate');
      expect(ok(await idps.getProviderType(REALM, 'oidc'))).to.be.an('object');

      const types = ok(await idps.listMapperTypes(REALM, 'corp'));
      expect(types).to.have.property('hardcoded-attribute-idp-mapper');
      const mapperId = ok(
        await idps.createMapper(REALM, 'corp', {
          name: 'department',
          identityProviderMapper: 'hardcoded-attribute-idp-mapper',
          config: { syncMode: 'INHERIT', attribute: 'department', 'attribute.value': 'R&D' },
        }),
      );
      expect(ok(await idps.listMappers(REALM, 'corp')).map((m) => m.id)).to.deep.equal([mapperId]);
      const mapper = ok(await idps.getMapper(REALM, 'corp', mapperId));
      ok(
        await idps.updateMapper(REALM, 'corp', mapperId, {
          ...mapper,
          config: { ...mapper.config, 'attribute.value': 'Ops' },
        }),
      );
      expect(ok(await idps.getMapper(REALM, 'corp', mapperId)).config?.['attribute.value']).to.equal('Ops');
      ok(await idps.deleteMapper(REALM, 'corp', mapperId));

      ok(await idps.delete(REALM, 'corp'));
      expect((await idps.get(REALM, 'corp')).status).to.equal(404);
    });
  });

  describe('organizations', function () {
    before(function () {
      if (!versionAtLeast('26.0')) {
        this.skip();
      }
    });

    it('manages organizations, members and identity providers', async () => {
      ok(await api.realms.update(REALM, { organizationsEnabled: true }));
      const orgs = api.organizations;
      const orgId = ok(await orgs.create(REALM, { name: 'Acme', alias: 'acme', domains: [{ name: 'acme.com' }] }));
      expect(ok(await orgs.list(REALM, { search: 'acme' })).map((o) => o.id)).to.deep.equal([orgId]);
      ok(await orgs.update(REALM, orgId, { ...ok(await orgs.get(REALM, orgId)), description: 'Anvils' }));
      expect(ok(await orgs.get(REALM, orgId)).description).to.equal('Anvils');
      if (versionAtLeast('26.3')) {
        expect(ok(await orgs.count(REALM))).to.equal(1);
      }

      const userId = ok(await api.users.create(REALM, { username: 'bob', email: 'bob@acme.com', enabled: true }));
      ok(await orgs.addMember(REALM, orgId, userId));
      expect(ok(await orgs.listMembers(REALM, orgId)).map((m) => m.id)).to.deep.equal([userId]);
      expect(ok(await orgs.countMembers(REALM, orgId))).to.equal(1);
      expect(ok(await orgs.getMember(REALM, orgId, userId)).username).to.equal('bob');
      expect(ok(await orgs.listByMember(REALM, userId)).map((o) => o.id)).to.deep.equal([orgId]);
      expect(ok(await orgs.listMemberOrganizations(REALM, orgId, userId)).map((o) => o.id)).to.deep.equal([orgId]);

      ok(
        await api.identityProviders.create(REALM, {
          alias: 'acme-idp',
          providerId: 'oidc',
          config: {
            authorizationUrl: 'https://idp.acme.com/auth',
            tokenUrl: 'https://idp.acme.com/token',
            clientId: 'kc',
            clientSecret: 'secret',
          },
        }),
      );
      ok(await orgs.linkIdentityProvider(REALM, orgId, 'acme-idp'));
      expect(ok(await orgs.listIdentityProviders(REALM, orgId)).map((i) => i.alias)).to.deep.equal(['acme-idp']);
      expect(ok(await orgs.getIdentityProvider(REALM, orgId, 'acme-idp')).alias).to.equal('acme-idp');
      ok(await orgs.unlinkIdentityProvider(REALM, orgId, 'acme-idp'));
      ok(await api.identityProviders.delete(REALM, 'acme-idp'));

      if (versionAtLeast('26.7')) {
        const groupId = ok(await orgs.groups.create(REALM, orgId, { name: 'staff' }));
        const childId = ok(await orgs.groups.createChild(REALM, orgId, groupId, { name: 'eng' }));
        expect(ok(await orgs.groups.list(REALM, orgId)).map((g) => g.id)).to.deep.equal([groupId]);
        expect(ok(await orgs.groups.listChildren(REALM, orgId, groupId)).map((g) => g.id)).to.deep.equal([childId]);
        expect(ok(await orgs.groups.getByPath(REALM, orgId, 'staff/eng')).id).to.equal(childId);
        ok(await orgs.groups.addMember(REALM, orgId, childId, userId));
        expect(ok(await orgs.groups.listMembers(REALM, orgId, childId)).map((m) => m.id)).to.deep.equal([userId]);
        expect(ok(await orgs.listMemberGroups(REALM, orgId, userId)).map((g) => g.id)).to.deep.equal([childId]);

        const ref = { organizationId: orgId, groupId };
        const offline = ok(await orgs.groups.roleMappings.listAvailableRealm(REALM, ref)).find(
          (r) => r.name === 'offline_access',
        )!;
        ok(await orgs.groups.roleMappings.addRealm(REALM, ref, [offline]));
        expect(ok(await orgs.groups.roleMappings.listRealm(REALM, ref)).map((r) => r.name)).to.deep.equal([
          'offline_access',
        ]);

        ok(await orgs.groups.removeMember(REALM, orgId, childId, userId));
        ok(
          await orgs.groups.update(REALM, orgId, groupId, {
            ...ok(await orgs.groups.get(REALM, orgId, groupId)),
            description: 'All staff',
          }),
        );
        expect(ok(await orgs.groups.get(REALM, orgId, groupId)).description).to.equal('All staff');
        ok(await orgs.groups.delete(REALM, orgId, groupId));
      }
      if (versionAtLeast('26.5')) {
        expect(ok(await orgs.listInvitations(REALM, orgId))).to.deep.equal([]);
      }

      ok(await orgs.removeMember(REALM, orgId, userId));
      expect(ok(await orgs.listMembers(REALM, orgId))).to.deep.equal([]);
      ok(await orgs.delete(REALM, orgId));
      expect((await orgs.get(REALM, orgId)).status).to.equal(404);
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

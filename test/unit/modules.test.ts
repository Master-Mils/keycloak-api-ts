import { expect } from 'chai';
import nock from 'nock';

import KeycloakAPI from '../../lib';

const BASE = 'http://keycloak.test';
const ADMIN = '/admin/realms/test';

describe('module endpoints', () => {
  let api: KeycloakAPI;

  beforeEach(() => {
    nock.disableNetConnect();
    nock(BASE)
      .post('/realms/master/protocol/openid-connect/token')
      .reply(200, { access_token: 'token', expires_in: 300 })
      .persist();
    api = new KeycloakAPI({
      baseUrl: BASE,
      credentials: { grantType: 'client_credentials', clientId: 'svc', clientSecret: 'x' },
      retries: 0,
      requestsPerSecond: 0,
    });
  });

  afterEach(() => {
    api.dispose();
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it('maps client roles of users, groups and organization groups', async () => {
    const roles = [{ id: 'r1', name: 'viewer' }];
    nock(BASE).post(`${ADMIN}/users/u%201/role-mappings/clients/c1`, roles).reply(204);
    nock(BASE)
      .get(`${ADMIN}/groups/g1/role-mappings/clients/c1/composite`)
      .query({ briefRepresentation: 'false' })
      .reply(200, roles);
    nock(BASE).delete(`${ADMIN}/organizations/o1/groups/g2/role-mappings/realm`, roles).reply(204);

    expect((await api.users.roleMappings.addClient('test', 'u 1', 'c1', roles)).success).to.equal(true);
    const composite = await api.groups.roleMappings.listCompositeClient('test', 'g1', 'c1', {
      briefRepresentation: false,
    });
    expect(composite.success && composite.data).to.deep.equal(roles);
    const removed = await api.organizations.groups.roleMappings.removeRealm(
      'test',
      { organizationId: 'o1', groupId: 'g2' },
      roles,
    );
    expect(removed.success).to.equal(true);
    expect(nock.isDone()).to.equal(true);
  });

  it('addresses scope mappings and protocol mappers of clients and client scopes', async () => {
    nock(BASE).get(`${ADMIN}/clients/c1/scope-mappings/clients/c2/available`).reply(200, []);
    nock(BASE)
      .post(`${ADMIN}/client-scopes/s1/protocol-mappers/models`)
      .reply(201, '', { Location: `${BASE}${ADMIN}/client-scopes/s1/protocol-mappers/models/m1` });
    nock(BASE).get(`${ADMIN}/clients/c1/protocol-mappers/protocol/openid-connect`).reply(200, []);

    expect((await api.clients.scopeMappings.listAvailableClient('test', 'c1', 'c2')).success).to.equal(true);
    const created = await api.clientScopes.protocolMappers.create('test', 's1', { name: 'm' });
    expect(created.success && created.data).to.equal('m1');
    expect((await api.clients.protocolMappers.listByProtocol('test', 'c1', 'openid-connect')).success).to.equal(true);
    expect(nock.isDone()).to.equal(true);
  });

  it('links default and optional client scopes', async () => {
    nock(BASE).put(`${ADMIN}/clients/c1/optional-client-scopes/s%2F1`).reply(204);
    nock(BASE).delete(`${ADMIN}/default-default-client-scopes/s1`).reply(204);
    nock(BASE)
      .get(`${ADMIN}/clients/c1/evaluate-scopes/scope-mappings/test/not-granted`)
      .query({ scope: 'openid email' })
      .reply(200, []);

    expect((await api.clients.addClientScope('test', 'c1', 'optional', 's/1')).success).to.equal(true);
    expect((await api.clientScopes.removeRealmDefault('test', 'default', 's1')).success).to.equal(true);
    const notGranted = await api.clients.evaluateScopeMappings('test', 'c1', 'test', false, { scope: 'openid email' });
    expect(notGranted.success).to.equal(true);
    expect(nock.isDone()).to.equal(true);
  });

  it('returns created authorization resources from the response body', async () => {
    const resource = { _id: 'res-1', name: 'docs' };
    nock(BASE).post(`${ADMIN}/clients/c1/authz/resource-server/resource`, { name: 'docs' }).reply(201, resource);
    nock(BASE).get(`${ADMIN}/clients/c1/authz/resource-server/policy/search`).query({ name: 'p' }).reply(204);
    nock(BASE)
      .post(`${ADMIN}/clients/c1/authz/resource-server/policy/role`, { type: 'role', name: 'admins', roles: [] })
      .reply(201, { id: 'p1', type: 'role', name: 'admins' });
    nock(BASE).put(`${ADMIN}/clients/c1/authz/resource-server/policy/resource/p2`).reply(201);

    const created = await api.clients.authorization.createResource('test', 'c1', { name: 'docs' });
    expect(created.success && created.data).to.deep.equal(resource);
    const missing = await api.clients.authorization.findPolicy('test', 'c1', 'p');
    expect(missing).to.deep.include({ success: true, status: 204, data: undefined });
    const policy = await api.clients.authorization.createPolicy('test', 'c1', {
      type: 'role',
      name: 'admins',
      roles: [],
    });
    expect(policy.success && policy.data.id).to.equal('p1');
    const updated = await api.clients.authorization.updatePolicy('test', 'c1', 'p2', { type: 'resource', name: 'x' });
    expect(updated.success).to.equal(true);
    expect(nock.isDone()).to.equal(true);
  });

  it('sends raw JSON strings and forms to the organization endpoints', async () => {
    nock(BASE)
      .post(`${ADMIN}/organizations/o1/members`, (body) => body === 'user-1')
      .matchHeader('content-type', /application\/json/)
      .reply(201, '', { Location: `${BASE}${ADMIN}/organizations/o1/members/user-1` });
    nock(BASE)
      .post(`${ADMIN}/organizations/o1/members/invite-user`, 'email=a%40b.com&firstName=Ann')
      .query({ client_id: 'portal' })
      .matchHeader('content-type', /application\/x-www-form-urlencoded/)
      .reply(204);
    nock(BASE).put(`${ADMIN}/organizations/o1/members/user-1/membership-type`, '"MANAGED"').reply(204);
    nock(BASE).get(`${ADMIN}/organizations/o1/groups/group-by-path/a%20b/c`).reply(200, { name: 'c' });

    const added = await api.organizations.addMember('test', 'o1', 'user-1');
    expect(added.success && added.data).to.equal('user-1');
    const invited = await api.organizations.inviteUser(
      'test',
      'o1',
      { email: 'a@b.com', firstName: 'Ann' },
      { clientId: 'portal' },
    );
    expect(invited.success).to.equal(true);
    expect((await api.organizations.updateMembershipType('test', 'o1', 'user-1', 'MANAGED')).success).to.equal(true);
    expect((await api.organizations.groups.getByPath('test', 'o1', '/a b/c')).success).to.equal(true);
    expect(nock.isDone()).to.equal(true);
  });

  it('fills the identity provider alias of new mappers', async () => {
    nock(BASE)
      .post(`${ADMIN}/identity-provider/instances/corp/mappers`, {
        identityProviderAlias: 'corp',
        name: 'dept',
        identityProviderMapper: 'hardcoded-attribute-idp-mapper',
      })
      .reply(201, '', { Location: `${BASE}${ADMIN}/identity-provider/instances/corp/mappers/m1` });

    const created = await api.identityProviders.createMapper('test', 'corp', {
      name: 'dept',
      identityProviderMapper: 'hardcoded-attribute-idp-mapper',
    });
    expect(created.success && created.data).to.equal('m1');
  });
});

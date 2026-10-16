import { expect } from 'chai';
import nock from 'nock';

import KeycloakAPI from '../../lib';
import { HttpClient } from '../../lib/api/http';
import { ClientRoles } from '../../lib/api/roles';

const BASE = 'http://keycloak.test';
const ADMIN = '/admin/realms/test';

describe('roles and groups endpoints', () => {
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

  it('adds composites to a realm role', async () => {
    const roles = [{ id: 'r1', name: 'viewer' }];
    nock(BASE).post(`${ADMIN}/roles/my%20role/composites`, roles).reply(204);
    expect((await api.roles.addComposites('test', 'my role', roles)).success).to.equal(true);
  });

  it('lists groups of a client role', async () => {
    const groups = [{ id: 'g1', name: 'devs' }];
    nock(BASE).get(`${ADMIN}/clients/c1/roles/admin/groups`).query({ first: '0', max: '5' }).reply(200, groups);
    const clientRoles = new ClientRoles(new HttpClient(api.httpClient));
    const res = await clientRoles.listGroups('test', 'c1', 'admin', { first: 0, max: 5 });
    expect(res.success && res.data).to.deep.equal(groups);
  });

  it('lists client composites of a role by id', async () => {
    const roles = [{ id: 'r2', name: 'x' }];
    nock(BASE).get(`${ADMIN}/roles-by-id/r1/composites/clients/c9`).reply(200, roles);
    const res = await api.roles.byId.listClientComposites('test', 'r1', 'c9');
    expect(res.success && res.data).to.deep.equal(roles);
  });

  it('encodes each segment of a group path', async () => {
    nock(BASE).get(`${ADMIN}/group-by-path/eng%20team/dev%231`).reply(200, { id: 'g1', name: 'dev#1' });
    const res = await api.groups.getByPath('test', '/eng team/dev#1');
    expect(res.success && res.data).to.deep.equal({ id: 'g1', name: 'dev#1' });
  });
});

import { expect } from 'chai';
import nock from 'nock';

import KeycloakAPI from '../../lib';
import AttackDetection from '../../lib/api/attack-detection';
import { HttpClient } from '../../lib/api/http';

const BASE = 'http://keycloak.test';
const ADMIN = '/admin/realms/test';

describe('users endpoints', () => {
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

  it('sends the credential label as text/plain', async () => {
    nock(BASE, { reqheaders: { 'content-type': /^text\/plain/ } })
      .put(`${ADMIN}/users/u1/credentials/c1/userLabel`, 'my phone')
      .reply(204);
    const res = await api.users.updateCredentialUserLabel('test', 'u1', 'c1', 'my phone');
    expect(res.success).to.equal(true);
  });

  it('maps execute-actions-email options to snake_case query', async () => {
    nock(BASE)
      .put(`${ADMIN}/users/u1/execute-actions-email`, ['UPDATE_PASSWORD'])
      .query({ client_id: 'app', lifespan: '600', redirect_uri: 'http://app/cb' })
      .reply(204);
    const res = await api.users.executeActionsEmail('test', 'u1', ['UPDATE_PASSWORD'], {
      clientId: 'app',
      lifespan: 600,
      redirectUri: 'http://app/cb',
    });
    expect(res.success).to.equal(true);
  });

  it('counts the groups of a user', async () => {
    nock(BASE).get(`${ADMIN}/users/u1/groups/count`).query({ search: 'adm' }).reply(200, { count: 3 });
    const res = await api.users.countGroups('test', 'u1', { search: 'adm' });
    expect(res.success && res.data.count).to.equal(3);
  });

  it('adds a federated identity', async () => {
    const body = { identityProvider: 'google', userId: 'g1', userName: 'a' };
    nock(BASE).post(`${ADMIN}/users/u1/federated-identity/google`, body).reply(204);
    const res = await api.users.addFederatedIdentity('test', 'u1', 'google', body);
    expect(res.success).to.equal(true);
  });

  it('queries and clears brute force status', async () => {
    const attack = new AttackDetection(new HttpClient(api.httpClient));
    nock(BASE).get(`${ADMIN}/attack-detection/brute-force/users/u1`).reply(200, { numFailures: 2 });
    nock(BASE).delete(`${ADMIN}/attack-detection/brute-force/users/u1`).reply(204);
    const status = await attack.get('test', 'u1');
    expect(status.success && status.data.numFailures).to.equal(2);
    expect((await attack.clear('test', 'u1')).success).to.equal(true);
  });
});

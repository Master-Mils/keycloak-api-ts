import { expect } from 'chai';
import nock from 'nock';

import KeycloakAPI from '../../lib';

const BASE = 'http://keycloak.test';
const ADMIN = '/admin/realms/test';

describe('authentication endpoints', () => {
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

  it('registers required actions and updates their config', async () => {
    nock(BASE).post(`${ADMIN}/authentication/register-required-action`, { providerId: 'p', name: 'N' }).reply(204);
    nock(BASE)
      .put(`${ADMIN}/authentication/required-actions/my%20alias/config`, { config: { a: 'b' } })
      .reply(204);
    const reg = await api.authentication.requiredActions.register('test', 'p', 'N');
    const upd = await api.authentication.requiredActions.updateConfig('test', 'my alias', { config: { a: 'b' } });
    expect(reg.status).to.equal(204);
    expect(upd.status).to.equal(204);
  });

  it('raises execution priority', async () => {
    nock(BASE).post(`${ADMIN}/authentication/executions/e1/raise-priority`).reply(204);
    const res = await api.authentication.flows.executions.raisePriority('test', 'e1');
    expect(res.status).to.equal(204);
  });

  it('creates an authenticator config and returns the id from Location', async () => {
    nock(BASE)
      .post(`${ADMIN}/authentication/executions/e1/config`, { alias: 'cfg' })
      .reply(201, '', { Location: `${BASE}${ADMIN}/authentication/config/c1` });
    const res = await api.authentication.flows.executions.createConfig('test', 'e1', { alias: 'cfg' });
    expect(res.data).to.equal('c1');
  });
});

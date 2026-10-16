import { expect } from 'chai';
import nock from 'nock';

import KeycloakAPI, { KeycloakAuthError, ServerSettings } from '../../lib';

const BASE = 'http://keycloak.test';
const TOKEN_PATH = '/realms/master/protocol/openid-connect/token';

const passwordSettings: ServerSettings = {
  baseUrl: `${BASE}/`,
  credentials: { grantType: 'password', clientId: 'admin-cli', username: 'admin', password: 's3cr3t' },
  retries: 0,
  requestsPerSecond: 0,
};

function tokenBody(accessToken: string, refreshToken = 'refresh-1') {
  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 300,
    refresh_expires_in: 1800,
    refresh_token: refreshToken,
  };
}

describe('KeycloakAPI', () => {
  let api: KeycloakAPI | undefined;

  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    api?.dispose();
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe('authentication', () => {
    it('uses the password grant and caches the token', async () => {
      let tokenBodySent = '';
      nock(BASE)
        .post(TOKEN_PATH, (body) => {
          tokenBodySent = new URLSearchParams(body).toString();
          return true;
        })
        .once()
        .reply(200, tokenBody('token-1'));
      nock(BASE, { reqheaders: { authorization: 'Bearer token-1' } })
        .get('/admin/realms/test/users/count')
        .twice()
        .reply(200, '3', { 'Content-Type': 'application/json' });

      api = new KeycloakAPI(passwordSettings);
      await api.users.count('test');
      const result = await api.users.count('test');

      expect(result).to.deep.include({ success: true, status: 200, data: 3 });
      const sent = new URLSearchParams(tokenBodySent);
      expect(sent.get('grant_type')).to.equal('password');
      expect(sent.get('username')).to.equal('admin');
      expect(sent.get('client_id')).to.equal('admin-cli');
      expect(nock.isDone()).to.equal(true);
    });

    it('uses client_credentials with HTTP basic auth and the configured realm', async () => {
      const basic = Buffer.from('svc:client-secret').toString('base64');
      nock(BASE, { reqheaders: { authorization: `Basic ${basic}` } })
        .post('/realms/acme/protocol/openid-connect/token', (body) => body.grant_type === 'client_credentials')
        .reply(200, { access_token: 'svc-token', expires_in: 60 });

      api = new KeycloakAPI({
        baseUrl: BASE,
        realmName: 'acme',
        credentials: { grantType: 'client_credentials', clientId: 'svc', clientSecret: 'client-secret' },
      });
      const token = await api.getToken();

      expect(token.accessToken).to.equal('svc-token');
      expect(token.expiresAt).to.be.a('number');
    });

    it('throws KeycloakAuthError when the token request is refused', async () => {
      nock(BASE).post(TOKEN_PATH).reply(401, { error: 'invalid_grant', error_description: 'Invalid user credentials' });

      api = new KeycloakAPI(passwordSettings);
      try {
        await api.users.list('test');
        expect.fail('should have thrown');
      } catch (error) {
        expect(error).to.be.instanceOf(KeycloakAuthError);
        expect((error as KeycloakAuthError).status).to.equal(401);
        expect((error as KeycloakAuthError).error).to.equal('invalid_grant');
      }
    });

    it('renews the token with the refresh token and retries once on 401', async () => {
      nock(BASE)
        .post(TOKEN_PATH, (body) => body.grant_type === 'password')
        .reply(200, tokenBody('token-1'));
      nock(BASE)
        .post(TOKEN_PATH, (body) => body.grant_type === 'refresh_token' && body.refresh_token === 'refresh-1')
        .reply(200, tokenBody('token-2', 'refresh-2'));
      nock(BASE, { reqheaders: { authorization: 'Bearer token-1' } })
        .get('/admin/realms/test')
        .reply(401, { error: 'HTTP 401 Unauthorized' });
      nock(BASE, { reqheaders: { authorization: 'Bearer token-2' } })
        .get('/admin/realms/test')
        .reply(200, { realm: 'test' });

      api = new KeycloakAPI(passwordSettings);
      const result = await api.realms.get('test');

      expect(result.success).to.equal(true);
      expect(result.data).to.deep.equal({ realm: 'test' });
      expect(nock.isDone()).to.equal(true);
    });
  });

  describe('responses', () => {
    beforeEach(() => {
      nock(BASE).post(TOKEN_PATH).reply(200, tokenBody('token-1')).persist();
      api = new KeycloakAPI(passwordSettings);
    });

    it('returns the created id from the Location header', async () => {
      nock(BASE)
        .post('/admin/realms/test/users', { username: 'foo', enabled: true })
        .reply(201, '', { Location: `${BASE}/admin/realms/test/users/1b2c3d` });

      const result = await api!.users.create('test', { username: 'foo', enabled: true });

      expect(result).to.deep.include({ success: true, status: 201, data: '1b2c3d' });
    });

    it('returns success false with the error payload instead of throwing', async () => {
      nock(BASE).get('/admin/realms/test/users/missing').reply(404, { error: 'User not found' });

      const result = await api!.users.get('test', 'missing');

      expect(result.success).to.equal(false);
      expect(result.status).to.equal(404);
      expect(result.error).to.deep.equal({ error: 'User not found' });
      expect(result.data).to.equal(undefined);
    });

    it('encodes list query parameters', async () => {
      nock(BASE)
        .get('/admin/realms/test/users')
        .query({ q: 'dept:R&D', exact: 'true', max: '5' })
        .reply(200, [{ username: 'foo' }]);

      const result = await api!.users.list('test', { q: 'dept:R&D', exact: true, max: 5, email: undefined });

      expect(result.success && result.data).to.deep.equal([{ username: 'foo' }]);
    });

    it('adds executions through the executions/execution endpoint', async () => {
      nock(BASE)
        .post('/admin/realms/test/authentication/flows/my%20flow/executions/execution', { provider: 'auth-cookie' })
        .reply(201, '', { Location: `${BASE}/admin/realms/test/authentication/executions/exec-1` });

      const result = await api!.authentication.flows.executions.create('test', 'my flow', 'auth-cookie');

      expect(result).to.deep.include({ success: true, data: 'exec-1' });
    });

    it('lists user storage providers as components', async () => {
      nock(BASE)
        .get('/admin/realms/test/components')
        .query({ type: 'org.keycloak.storage.UserStorageProvider' })
        .reply(200, [{ id: 'ldap-1', providerId: 'ldap' }]);

      const result = await api!.userStorageProvider.list('test');

      expect(result.success && result.data[0].id).to.equal('ldap-1');
    });
  });
});

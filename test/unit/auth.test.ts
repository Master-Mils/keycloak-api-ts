import { expect } from 'chai';
import nock from 'nock';

import { KeycloakAuthError, TokenManager } from '../../lib/auth';

const BASE = 'http://keycloak.test';
const TOKEN_PATH = '/realms/master/protocol/openid-connect/token';

function manager(credentials: ConstructorParameters<typeof TokenManager>[0]['credentials']) {
  return new TokenManager({ baseUrl: BASE, realmName: 'master', credentials });
}

describe('TokenManager', () => {
  beforeEach(() => nock.disableNetConnect());
  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it('shares one token request between concurrent callers', async () => {
    const scope = nock(BASE).post(TOKEN_PATH).once().delay(50).reply(200, { access_token: 'a', expires_in: 300 });
    const tokens = manager({ grantType: 'client_credentials', clientId: 'svc', clientSecret: 'x' });

    const results = await Promise.all([tokens.getToken(), tokens.getToken(), tokens.getToken()]);

    expect(results.map((t) => t.accessToken)).to.deep.equal(['a', 'a', 'a']);
    expect(scope.isDone()).to.equal(true);
  });

  it('requests a new token once the cached one is due', async () => {
    nock(BASE).post(TOKEN_PATH).reply(200, { access_token: 'short', expires_in: 1 });
    nock(BASE).post(TOKEN_PATH).reply(200, { access_token: 'next', expires_in: 300 });
    const tokens = manager({ grantType: 'client_credentials', clientId: 'svc', clientSecret: 'x' });

    expect((await tokens.getToken()).accessToken).to.equal('short');
    await new Promise((resolve) => setTimeout(resolve, 800));
    expect((await tokens.getToken()).accessToken).to.equal('next');
  });

  it('falls back to the full grant when the refresh token is rejected', async () => {
    nock(BASE)
      .post(TOKEN_PATH, (b) => b.grant_type === 'password')
      .reply(200, { access_token: 'a', expires_in: 300, refresh_token: 'r', refresh_expires_in: 1800 });
    nock(BASE)
      .post(TOKEN_PATH, (b) => b.grant_type === 'refresh_token')
      .reply(400, { error: 'invalid_grant' });
    nock(BASE)
      .post(TOKEN_PATH, (b) => b.grant_type === 'password')
      .reply(200, { access_token: 'b', expires_in: 300 });
    const tokens = manager({ grantType: 'password', clientId: 'admin-cli', username: 'u', password: 'p' });

    await tokens.getToken();
    tokens.invalidate();

    expect((await tokens.getToken()).accessToken).to.equal('b');
    expect(nock.isDone()).to.equal(true);
  });

  it('requires a refresh token for the refresh_token grant', async () => {
    const tokens = manager({ grantType: 'refresh_token', clientId: 'cli' });
    try {
      await tokens.getToken();
      expect.fail('should have thrown');
    } catch (error) {
      expect(error).to.be.instanceOf(KeycloakAuthError);
    }
  });
});

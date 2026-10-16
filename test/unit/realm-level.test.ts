import { expect } from 'chai';
import nock from 'nock';

import KeycloakAPI from '../../lib';

const BASE = 'http://keycloak.test';
const ADMIN = '/admin/realms/test';

describe('realm-level endpoints', () => {
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

  it('repeats array filters of events and admin events', async () => {
    nock(BASE)
      .get(`${ADMIN}/events`)
      .query((q) => JSON.stringify(q.type) === '["LOGIN","LOGOUT"]' && q.max === '5')
      .reply(200, []);
    nock(BASE).get(`${ADMIN}/admin-events`).query({ operationTypes: 'CREATE', direction: 'asc' }).reply(200, []);

    expect((await api.realms.listEvents('test', { type: ['LOGIN', 'LOGOUT'], max: 5 })).success).to.equal(true);
    const admin = await api.realms.listAdminEvents('test', { operationTypes: ['CREATE'], direction: 'asc' });
    expect(admin.success).to.equal(true);
    expect(nock.isDone()).to.equal(true);
  });

  it('sends localization texts as plain text and maps client policy flags', async () => {
    nock(BASE)
      .put(`${ADMIN}/localization/pt-BR/hello%20world`, 'Olá')
      .matchHeader('content-type', /text\/plain/)
      .reply(204);
    nock(BASE).get(`${ADMIN}/localization/pt-BR/greeting`).reply(200, 'Oi', { 'Content-Type': 'text/plain' });
    nock(BASE).get(`${ADMIN}/client-policies/policies`).query({ 'include-global-policies': 'true' }).reply(200, {});
    nock(BASE).delete(`${ADMIN}/sessions/s1`).query({ isOffline: 'true' }).reply(204);

    expect((await api.realms.updateLocalizationText('test', 'pt-BR', 'hello world', 'Olá')).success).to.equal(true);
    const text = await api.realms.getLocalizationText('test', 'pt-BR', 'greeting');
    expect(text.success && text.data).to.equal('Oi');
    expect((await api.realms.getClientPolicies('test', { includeGlobalPolicies: true })).success).to.equal(true);
    expect((await api.realms.deleteSession('test', 's1', { isOffline: true })).success).to.equal(true);
    expect(nock.isDone()).to.equal(true);
  });

  it('downloads keystores as buffers and uploads certificates as multipart', async () => {
    nock(BASE)
      .post(`${ADMIN}/clients/c1/certificates/jwt.credential/download`, { format: 'PKCS12' })
      .reply(200, Buffer.from([1, 2, 3]), { 'Content-Type': 'application/octet-stream' });
    nock(BASE)
      .post(`${ADMIN}/clients/c1/certificates/jwt.credential/upload-certificate`, (body: string) =>
        /name="keystoreFormat"[\s\S]*Certificate PEM[\s\S]*name="file"/.test(body),
      )
      .matchHeader('content-type', /multipart\/form-data/)
      .reply(200, { certificate: 'MII' });

    const keystore = await api.clients.downloadKeystore('test', 'c1', 'jwt.credential', { format: 'PKCS12' });
    expect(keystore.success && [...keystore.data]).to.deep.equal([1, 2, 3]);
    const uploaded = await api.clients.uploadCertificate('test', 'c1', 'jwt.credential', {
      keystoreFormat: 'Certificate PEM',
      file: '-----BEGIN CERTIFICATE-----',
    });
    expect(uploaded.success && uploaded.data.certificate).to.equal('MII');
    expect(nock.isDone()).to.equal(true);
  });

  it('addresses client templates, client roles and client registration', async () => {
    nock(BASE).get(`${ADMIN}/client-templates/t1/scope-mappings/realm`).reply(200, []);
    nock(BASE).get(`${ADMIN}/clients/c1/roles/viewer/composites`).reply(200, []);
    nock(BASE)
      .post(`${ADMIN}/clients-initial-access`, { count: 1, expiration: 60 })
      .reply(201, { id: 'ia1', token: 'tkn' });

    expect((await api.clientScopes.templates.scopeMappings.listRealm('test', 't1')).success).to.equal(true);
    expect((await api.clients.roles.listComposites('test', 'c1', 'viewer')).success).to.equal(true);
    const access = await api.clientRegistration.createInitialAccess('test', { count: 1, expiration: 60 });
    expect(access.success && access.data.token).to.equal('tkn');
    expect(nock.isDone()).to.equal(true);
  });

  it('sends workflows as JSON or YAML', async () => {
    nock(BASE)
      .post(`${ADMIN}/workflows`, 'name: onboarding\n')
      .matchHeader('content-type', /application\/yaml/)
      .reply(201, '', { Location: `${BASE}${ADMIN}/workflows/w1` });
    nock(BASE).post(`${ADMIN}/workflows/w1/activate/users/u1`).query({ notBefore: 'P1D' }).reply(204);

    const created = await api.workflows.create('test', 'name: onboarding\n');
    expect(created.success && created.data).to.equal('w1');
    const activated = await api.workflows.activate('test', 'w1', 'users', 'u1', { notBefore: 'P1D' });
    expect(activated.success).to.equal(true);
    expect(nock.isDone()).to.equal(true);
  });
});

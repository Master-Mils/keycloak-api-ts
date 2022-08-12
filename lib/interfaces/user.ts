import UserConsent from './user-consent';
import Credential from './credential';
import FederatedIdentity from './federated-identity';

export default interface User {
  access?: Map<string, string>,
  attributes?: Map<string, string>,
  clientConsents?: UserConsent[],
  clientRoles?: Map<string, string>,
  createdTimestamp?: number,
  credentials?: Credential[],
  disableableCredentialTypes?: string[],
  email?: string,
  emailVerified?: boolean,
  enabled?: boolean,
  federatedIdentities?: FederatedIdentity[],
  federationLink?: string,
  firstName?: string,
  groups?: string[],
  id?: string,
  lastName?: string,
  notBefore?: number,
  origin?: string,
  realmRoles?: string[],
  requiredActions?: string[],
  self?: string,
  serviceAccountClientId?: string,
  username?: string
}
import UserConsent from './user-consent';
import Credential from './credential';
import FederatedIdentity from './federated-identity';

export default interface User {
  access?: object;
  attributes?: object;
  clientConsents?: UserConsent[];
  clientRoles?: object;
  createdTimestamp?: number;
  credentials?: Credential[];
  disableableCredentialTypes?: string[];
  email?: string;
  emailVerified?: boolean;
  enabled?: boolean;
  federatedIdentities?: FederatedIdentity[];
  federationLink?: string;
  firstName?: string;
  groups?: string[];
  id?: string;
  lastName?: string;
  notBefore?: number;
  origin?: string;
  realmRoles?: string[];
  requiredActions?: string[];
  self?: string;
  serviceAccountClientId?: string;
  username?: string;
}

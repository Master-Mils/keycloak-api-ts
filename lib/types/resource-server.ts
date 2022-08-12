import Policy from './policy';
import Resource from './resource';
import Scope from './scope';

export default interface ResourceServer {
  allowRemoteResourceManagement?: boolean;
  clientId?: string;
  decisionStrategy?: 'AFFIRMATIVE' | 'UNANIMOUS' | 'CONSENSUS';
  id?: string;
  name?: string;
  policies?: Policy[];
  policyEnforcementMode?: 'ENFORCING' | 'PERMISSIVE' | 'DISABLED';
  resources?: Resource[];
  scopes?: Scope[];
}

import Resource from './resource';
import Scope from './scope';

export default interface Policy {
  config?: Map<string, string>,
  decisionStrategy?: 'AFFIRMATIVE' | 'UNANIMOUS' | 'CONSENSUS',
  description?: string,
  id?: string,
  logic?: 'POSITIVE', 'NEGATIVE',
  name?: string,
  owner?: string,
  policies?: string[],
  resources?: string[],
  resourcesData?: Resource[],
  scopes?: string[],
  scopesData?: Scope[],
  type?: string
}
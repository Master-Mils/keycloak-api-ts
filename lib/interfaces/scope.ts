import Policy from './policy';
import Resource from './resource';

export default interface Scope {
  displayName?: string,
  iconUri?: string,
  id?: string,
  name?: string,
  policies?: Policy[],
  resources?: Resource[]
}
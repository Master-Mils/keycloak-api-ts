import Scope from './scope';

export default interface Resource {
  id?: string,
  attributes?: object,
  displayName?: string,
  icon_uri?: string,
  name?: string,
  ownerManagedAccess?: boolean,
  scopes?: Scope[],
  type?: string,
  uris?: string[]
}
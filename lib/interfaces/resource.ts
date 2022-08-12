import Scope from './scope';

export default interface Resource {
  id?: string,
  attributes?: Map<string, string>,
  displayName?: string,
  icon_uri?: string,
  name?: string,
  ownerManagedAccess?: boolean,
  scopes?: Scope[],
  type?: string,
  uris?: string[]
}
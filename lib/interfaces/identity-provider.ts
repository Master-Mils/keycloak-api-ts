export default interface IdentityProvider {
  addReadTokenRoleOnCreate?: boolean,
  alias?: string,
  config?: Map<string, string>,
  displayName?: string,
  enabled?: boolean,
  firstBrokerLoginFlowAlias?: string,
  internalId?: string,
  linkOnly?: boolean,
  postBrokerLoginFlowAlias?: string,
  providerId?: string,
  storeToken?: boolean,
  trustEmail?: boolean
}
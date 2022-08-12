export default interface UserConsent {
  clientId?: string,
  createdDate?: number,
  grantedClientScopes?: string[],
  lastUpdatedDate?: number
}
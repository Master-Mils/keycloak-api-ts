export default interface UserFederationProvider {
  changedSyncPeriod?: number,
  config?: Map<string, string>,
  displayName?: string,
  fullSyncPeriod?: number,
  id?: string,
  lastSync?: number,
  priority?: number,
  providerName?: string
}
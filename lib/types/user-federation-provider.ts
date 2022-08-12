export default interface UserFederationProvider {
  changedSyncPeriod?: number;
  config?: object;
  displayName?: string;
  fullSyncPeriod?: number;
  id?: string;
  lastSync?: number;
  priority?: number;
  providerName?: string;
}

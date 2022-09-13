export default interface ServerSettings {
  baseUrl: string;
  username?: string;
  password?: string;
  grant_type: string;
  client_id: string;
  realmName?: string;
  accessToken?: string;
  client_secret?: string;
  scope?: string;
}

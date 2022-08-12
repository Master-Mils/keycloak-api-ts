export default interface Credential {
  createdDate?: number,
  credentialData?: string,
  id?: string,
  priority?: number,
  secretData?: string,
  temporary?: boolean,
  type?: string,
  userLabel?: string,
  value?: string
}
export default interface AuthenticationExecutionInfo {
  alias?: string,
  authenticationConfig?: string,
  authenticationFlow?: boolean,
  configurable?: boolean,
  description?: string,
  displayName?: string,
  flowId?: string,
  id?: string,
  index?: number,
  level?: number,
  providerId?: string,
  requirement?: string,
  requirementChoices?: string[]
}
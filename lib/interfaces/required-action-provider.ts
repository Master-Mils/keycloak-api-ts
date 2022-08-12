export default interface RequiredActionProvider {
  alias?: string,
  config?: Map<string, string>,
  defaultAction?: boolean,
  enabled?: boolean,
  name?: string,
  priority?: number,
  providerId?: string
}
export default interface Group {
  access?: Map<string, string>,
  attributes?: Map<string, string>,
  clientRoles?: Map<string, string>,
  id?: string,
  name?: string,
  path?: string,
  realmRoles?: string[],
  subGroups?: Group[]
}
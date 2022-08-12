export default interface Group {
  access?: object;
  attributes?: object;
  clientRoles?: object;
  id?: string;
  name?: string;
  path?: string;
  realmRoles?: string[];
  subGroups?: Group[];
}

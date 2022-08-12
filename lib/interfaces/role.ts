import RoleComposites from './role-composites';

export default interface Role {
  attributes?: Map<string, string>,
  clientRole?: boolean,
  composite?: boolean,
  composites?: RoleComposites,
  containerId?: string,
  description?: string,
  id?: string,
  name?: string
}
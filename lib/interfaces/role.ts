import RoleComposites from './role-composites';

export default interface Role {
  attributes?: object,
  clientRole?: boolean,
  composite?: boolean,
  composites?: RoleComposites,
  containerId?: string,
  description?: string,
  id?: string,
  name?: string
}
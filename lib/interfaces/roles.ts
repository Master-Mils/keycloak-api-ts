import Role from './role';

export default interface Roles {
  client?: Map<string, string>,
  realm?: Role[]
}
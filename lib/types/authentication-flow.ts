import AuthenticationExecutionExport from './authentication-execution-export';

export default interface AuthenticationFlow {
  alias?: string;
  authenticationExecutions?: AuthenticationExecutionExport[];
  builtIn?: boolean;
  description?: string;
  id?: string;
  providerId?: string;
  topLevel?: boolean;
}

import ProtocolMapper from './protocol-mapper';

export default interface ClientScope {
  attributes?: Map<string, string>,
  description?: string,
  id?: string,
  name?: string,
  protocol?: string,
  protocolMappers?: ProtocolMapper[]
}
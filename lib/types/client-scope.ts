import ProtocolMapper from './protocol-mapper';

export default interface ClientScope {
  attributes?: object;
  description?: string;
  id?: string;
  name?: string;
  protocol?: string;
  protocolMappers?: ProtocolMapper[];
}

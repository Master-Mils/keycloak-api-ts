import { Axios } from 'axios';

import Flows from './flows';

class Authentication {
  httpClient: Axios;
  flows: Flows;

  constructor(httpClient: Axios) {
    this.httpClient = httpClient;
    this.flows = new Flows(this.httpClient);
  }
}

export default Authentication;

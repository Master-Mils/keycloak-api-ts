import { HttpClient } from '../http';

import Flows from './flows';

export default class Authentication {
  readonly flows: Flows;

  constructor(http: HttpClient) {
    this.flows = new Flows(http);
  }
}

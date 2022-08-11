import { Axios } from "axios";

class Realms {

  httpClient: Axios;

  constructor(httpClient: Axios) {
    this.httpClient = httpClient;
  }

}

export default Realms;

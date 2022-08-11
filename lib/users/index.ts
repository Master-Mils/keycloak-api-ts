import { Axios } from "axios";

class Users {

  httpClient: Axios;

  constructor(httpClient: Axios) {
    this.httpClient = httpClient;
  }


}

export default Users;

import { Axios } from "axios";

import Realm from "../interfaces/realm"

class Realms {

  httpClient: Axios;

  constructor(httpClient: Axios) {
    this.httpClient = httpClient;
  }

  async import(data: Realm): Promise<boolean> {
    const url = `/`;
    return await this.httpClient
      .post(url, JSON.stringify(data))
      .then((response) => {
        if (response.status === 201) {
          return true;
        } else {
          return false;
        }
      });
  }

  /**
   * Get the top-level representation of the realm It will not include nested information like User and Client representations.
   * 
   * @param realm realm name (not id!)
   * @returns {Realm} On success return a representation of the realm.
   */
  async get(realm: string): Promise<Realm> {
    const url = `/${realm}`;
    return await this.httpClient
      .get(url)
      .then((response) => {
        return JSON.parse(response.data);
      });
  }

  /**
   * Update the top-level information of the realm Any user, roles or client information in the representation will be ignored.
   * 
   * This will only update top-level attributes of the realm.
   * 
   * @param realm realm name (not id!)
   * @param data 
   * @returns {boolean} success or failure.
   */
  async update(realm: string, data: Realm): Promise<boolean> {
    const url = `/${realm}`;
    return await this.httpClient
      .put(url, JSON.stringify(data))
      .then((response) => {
        if (response.status === 204) {
          return true;
        } else {
          return false;
        }
      });
  }

  /**
   * Delete the realm
   * 
   * @param realm realm name (not id!)
   * @returns {boolean} success or failure.
   */
  async delete(realm: string): Promise<boolean> {
    const url = `/${realm}`;
    return await this.httpClient
      .delete(url)
      .then((response) => {
        if (response.status === 204) {
          return true;
        } else {
          return false;
        }
      });
  }

}

export default Realms;

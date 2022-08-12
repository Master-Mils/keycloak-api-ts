import { Axios } from "axios";

import User from "../interfaces/user"


interface UserListQueryParameters {
  briefRepresentation?: boolean,
  email?: string,
  enabled?: boolean,
  exact?: boolean,
  first?: number,
  firstName?: string,
  lastName?: string,
  max?: number,
  search?: string,
  username?: string
}

interface UserCountQueryParameters {
  email?: string,
  firstName?: string,
  lastName?: string,
  search?: string,
  username?: string
}

class Users {

  httpClient: Axios;

  constructor(httpClient: Axios) {
    this.httpClient = httpClient;
  }

  async create(realm: string, data: User): Promise<boolean> {
    const url = `/${realm}/users`;
    return await this.httpClient
      .post(url, data)
      .then((response) => {
        return true;
      });
  }

  async get(realm: string, id: string): Promise<User> {
    const url = `/${realm}/users/${id}`;
    return await this.httpClient
      .get(url)
      .then((response) => {
        return JSON.parse(response.data);
      });
  }

  async count(realm: string, options?: UserCountQueryParameters): Promise<number> {

    let queryParams = options ?
      Object
        .entries(options)
        .flatMap(([key, value]) => `${key}=${value}`)
        .join('&') :
      undefined;

    const url = `/${realm}/users/count${queryParams ? '?'.concat(queryParams) : ''}`;

    return await this.httpClient
      .get(url)
      .then((response) => {
        return response.data;
      });
  }

  async list(realm: string, options?: UserListQueryParameters): Promise<User[]> {

    let queryParams = options ?
      Object
        .entries(options)
        .flatMap(([key, value]) => `${key}=${value}`)
        .join('&') :
      undefined;

    const url = `/${realm}/users${queryParams ? '?'.concat(queryParams) : ''}`;

    return await this.httpClient
      .get(url)
      .then((response) => {
        return JSON.parse(response.data);
      });
  }

  async update(realm: string, id: string, data: User): Promise<boolean> {
    const url = `/${realm}/users/${id}`;
    return await this.httpClient
      .put(url, data)
      .then((response) => {
        // TODO: check if this works correctly.
        return response.data || false;
      });
  }

  async delete(realm: string, id: string): Promise<boolean> {
    const url = `/${realm}/users/${id})`;
    return await this.httpClient
      .delete(url)
      .then(() => {
        return true;
      });
  }

}

export default Users;

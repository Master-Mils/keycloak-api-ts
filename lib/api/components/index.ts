import { Axios } from 'axios';

export class Components {
  constructor(private axios: Axios) {}

  // List all components
  async list(realm: string) {
    const path = `/${realm}/components`;
    const response = await this.axios.get(path);
    if (response.status === 200) {
      return { success: true, data: response.data, status: response.status, statusText: response.statusText };
    } else {
      return { success: false, data: response.data, status: response.status, statusText: response.statusText };
    }
  }

  // Create a component
  async create(realm: string, component: any) {
    const path = `/${realm}/components`;
    const response = await this.axios.post(path, component);
    if (response.status === 201) {
      return { success: true, data: response.data, status: response.status, statusText: response.statusText };
    } else {
      return { success: false, data: response.data, status: response.status, statusText: response.statusText };
    }
  }

  // Get a component by ID
  async get(realm: string, componentId: string) {
    const path = `/${realm}/components/${componentId}`;
    const response = await this.axios.get(path);
    if (response.status === 200) {
      return { success: true, data: response.data, status: response.status, statusText: response.statusText };
    } else {
      return { success: false, data: response.data, status: response.status, statusText: response.statusText };
    }
  }

  // Update a component
  async update(realm: string, componentId: string, component: any) {
    const path = `/${realm}/components/${componentId}`;
    const response = await this.axios.put(path, component);
    if (response.status === 204) {
      return { success: true, data: response.data, status: response.status, statusText: response.statusText };
    } else {
      return { success: false, data: response.data, status: response.status, statusText: response.statusText };
    }
  }

  // Delete a component
  async delete(realm: string, componentId: string) {
    const path = `/${realm}/components/${componentId}`;
    const response = await this.axios.delete(path);
    if (response.status === 204) {
      return { success: true, data: response.data, status: response.status, statusText: response.statusText };
    } else {
      return { success: false, data: response.data, status: response.status, statusText: response.statusText };
    }
  }
}

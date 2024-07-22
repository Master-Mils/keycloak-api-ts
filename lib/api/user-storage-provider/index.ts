import { Axios } from 'axios';

type ActionType = 'triggerFullSync' | 'triggerChangedUsersSync';
type DirectionType = 'fedToKeycloak' | 'keycloakToFed';

export class UserStorageProvider {
  constructor(private axios: Axios) {}

  // List all user storage providers
  async list(realm: string) {
    const path = `/${realm}/user-storage`;
    const response = await this.axios.get(path);
    if (response.status === 200) {
      return { success: true, data: response.data, status: response.status, statusText: response.statusText };
    } else {
      return { success: false, data: response.data, status: response.status, statusText: response.statusText };
    }
  }

  // Remove imported users
  async removeImportedUsers(realm: string, storageId: string) {
    const path = `/${realm}/user-storage/${storageId}/remove-imported-users`;
    const response = await this.axios.post(path);
    if (response.status === 204) {
      return { success: true, data: response.data, status: response.status, statusText: response.statusText };
    } else {
      return { success: false, data: response.data, status: response.status, statusText: response.statusText };
    }
  }

  // Sync users
  async syncUsers(realm: string, storageId: string, action?: ActionType) {
    const path = `/${realm}/user-storage/${storageId}/sync${action ? '?action='.concat(action) : ''}`;
    const response = await this.axios.post(path);
    if (response.status === 200) {
      return { success: true, data: response.data, status: response.status, statusText: response.statusText };
    } else {
      return { success: false, data: response.data, status: response.status, statusText: response.statusText };
    }
  }

  // Unlink users
  async unlinkUsers(realm: string, storageId: string) {
    const path = `/${realm}/user-storage/${storageId}/unlink-users`;
    const response = await this.axios.post(path);
    if (response.status === 204) {
      return { success: true, data: response.data, status: response.status, statusText: response.statusText };
    } else {
      return { success: false, data: response.data, status: response.status, statusText: response.statusText };
    }
  }

  async mappersSync(realm: string, storageId: string, parentId: string, direction?: DirectionType) {
    const path = `/${realm}/user-storage/${parentId}/mappers/${storageId}/sync${
      direction ? '?direction='.concat(direction) : ''
    }`;
    const response = await this.axios.post(path);
    if (response.status === 204) {
      return { success: true, data: response.data, status: response.status, statusText: response.statusText };
    } else {
      return { success: false, data: response.data, status: response.status, statusText: response.statusText };
    }
  }

  // List mappers
  async listMappers(realm: string, storageId: string) {
    const path = `/${realm}/user-storage/${storageId}/mappers`;
    const response = await this.axios.get(path);
    if (response.status === 200) {
      return { success: true, data: response.data, status: response.status, statusText: response.statusText };
    } else {
      return { success: false, data: response.data, status: response.status, statusText: response.statusText };
    }
  }
}

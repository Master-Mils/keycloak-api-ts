import { HttpClient, path } from '../http';
import RequiredActionProvider from '../../types/required-action-provider';
import RequiredActionConfig from '../../types/required-action-config';
import RequiredActionConfigInfo from '../../types/required-action-config-info';
import ApiResponse from '../../types/api-response';

/** Required actions of a realm. */
export default class RequiredActions {
  constructor(private readonly http: HttpClient) {}

  list(realm: string): Promise<ApiResponse<RequiredActionProvider[]>> {
    return this.http.get(path`/${realm}/authentication/required-actions`);
  }

  get(realm: string, alias: string): Promise<ApiResponse<RequiredActionProvider>> {
    return this.http.get(path`/${realm}/authentication/required-actions/${alias}`);
  }

  update(realm: string, alias: string, data: RequiredActionProvider): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/authentication/required-actions/${alias}`, data);
  }

  delete(realm: string, alias: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/authentication/required-actions/${alias}`);
  }

  /** Registers an unregistered required action provider. */
  register(realm: string, providerId: string, name: string): Promise<ApiResponse<void>> {
    return this.http.post(path`/${realm}/authentication/register-required-action`, { providerId, name });
  }

  /** Lists required action providers not yet registered (maps with `providerId` and `name`). */
  listUnregistered(realm: string): Promise<ApiResponse<Array<Record<string, string>>>> {
    return this.http.get(path`/${realm}/authentication/unregistered-required-actions`);
  }

  raisePriority(realm: string, alias: string): Promise<ApiResponse<void>> {
    return this.http.post(path`/${realm}/authentication/required-actions/${alias}/raise-priority`);
  }

  lowerPriority(realm: string, alias: string): Promise<ApiResponse<void>> {
    return this.http.post(path`/${realm}/authentication/required-actions/${alias}/lower-priority`);
  }

  getConfig(realm: string, alias: string): Promise<ApiResponse<RequiredActionConfig>> {
    return this.http.get(path`/${realm}/authentication/required-actions/${alias}/config`);
  }

  updateConfig(realm: string, alias: string, data: RequiredActionConfig): Promise<ApiResponse<void>> {
    return this.http.put(path`/${realm}/authentication/required-actions/${alias}/config`, data);
  }

  deleteConfig(realm: string, alias: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/authentication/required-actions/${alias}/config`);
  }

  getConfigDescription(realm: string, alias: string): Promise<ApiResponse<RequiredActionConfigInfo>> {
    return this.http.get(path`/${realm}/authentication/required-actions/${alias}/config-description`);
  }
}

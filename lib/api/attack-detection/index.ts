import { HttpClient, path } from '../http';
import ApiResponse from '../../types/api-response';

/** Brute force detection status of users. */
export default class AttackDetection {
  constructor(private readonly http: HttpClient) {}

  /** Clears the login failures of all users, releasing temporarily disabled ones. */
  clearAll(realm: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/attack-detection/brute-force/users`);
  }

  /** Gets the brute force status of a user (e.g. `numFailures`, `disabled`, `lastFailure`). */
  get(realm: string, userId: string): Promise<ApiResponse<Record<string, unknown>>> {
    return this.http.get(path`/${realm}/attack-detection/brute-force/users/${userId}`);
  }

  /** Clears the login failures of a user, releasing a temporary lock. */
  clear(realm: string, userId: string): Promise<ApiResponse<void>> {
    return this.http.delete(path`/${realm}/attack-detection/brute-force/users/${userId}`);
  }
}

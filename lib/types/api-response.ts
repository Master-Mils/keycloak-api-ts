/**
 * Result of every Admin API call.
 *
 * Requests never throw on HTTP error statuses: check `success` and read `data` on success,
 * or `status`/`error` otherwise. Network failures and authentication errors are still thrown.
 */
type ApiResponse<T> =
  | {
      success: true;
      status: number;
      statusText: string;
      /** Response body. For `201 Created`, the id taken from the `Location` header. */
      data: T;
      error?: undefined;
    }
  | {
      success: false;
      status: number;
      statusText: string;
      data?: undefined;
      /** Error payload returned by Keycloak (e.g. `{ errorMessage: '...' }`). */
      error: unknown;
    };

export default ApiResponse;

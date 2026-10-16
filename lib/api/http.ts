import { AxiosError, AxiosInstance, AxiosResponse } from 'axios';

import ApiResponse from '../types/api-response';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  params?: QueryParams;
  data?: unknown;
  headers?: Record<string, string>;
  /** Use `'arraybuffer'` for binary downloads (keystores); `data` is then a `Buffer`. */
  responseType?: 'json' | 'text' | 'arraybuffer';
  /** Return the body of a `201` even when a `Location` header is present (default: the id from `Location`). */
  keepBody?: boolean;
}

/** Hook invoked once when Keycloak answers 401, so the caller can drop its cached token before a retry. */
export type UnauthorizedHandler = () => void;

/** Builds `?a=1&b=2` from defined values only, with proper URL encoding. */
export function buildQuery(params?: QueryParams): string {
  if (!params) {
    return '';
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      search.append(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

/** Returns the last path segment of a `Location` header (the id of a created resource). */
export function idFromLocation(location?: string): string | undefined {
  if (!location) {
    return undefined;
  }
  const segments = location.split('?')[0].split('/').filter(Boolean);
  return segments.length ? decodeURIComponent(segments[segments.length - 1]) : undefined;
}

/** Tagged template that URL-encodes every interpolated path segment. */
export function path(strings: TemplateStringsArray, ...values: Array<string | number>): string {
  return strings.reduce((url, part, i) => url + part + (i < values.length ? encodeURIComponent(values[i]) : ''), '');
}

export class HttpClient {
  constructor(
    private readonly axios: AxiosInstance,
    private readonly onUnauthorized?: UnauthorizedHandler,
  ) {}

  get<T>(url: string, params?: QueryParams): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, { params });
  }

  post<T = string>(url: string, data?: unknown, params?: QueryParams): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, { data, params });
  }

  put<T = void>(url: string, data?: unknown, params?: QueryParams): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, { data, params });
  }

  delete<T = void>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, { data });
  }

  async request<T>(method: HttpMethod, url: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const send = () =>
      this.axios.request({
        method,
        url: url + buildQuery(options.params),
        data: options.data,
        headers: options.headers,
        responseType: options.responseType,
      });

    let response: AxiosResponse;
    try {
      response = await send();
    } catch (error) {
      response = HttpClient.responseOf(error);
      if (response.status === 401 && this.onUnauthorized) {
        this.onUnauthorized();
        try {
          response = await send();
        } catch (retryError) {
          response = HttpClient.responseOf(retryError);
        }
      }
    }

    return HttpClient.toApiResponse<T>(response, options.keepBody);
  }

  private static responseOf(error: unknown): AxiosResponse {
    if (error instanceof AxiosError && error.response) {
      return error.response;
    }
    // Network errors, timeouts and authentication failures are not HTTP results: let them surface.
    throw error;
  }

  private static toApiResponse<T>(response: AxiosResponse, keepBody = false): ApiResponse<T> {
    const { status, statusText } = response;
    if (status >= 200 && status < 300) {
      const location = response.headers?.location as string | undefined;
      const data = status === 201 && location && !keepBody ? idFromLocation(location) : response.data;
      return { success: true, status, statusText, data: (data === '' ? undefined : data) as T };
    }
    return { success: false, status, statusText, error: HttpClient.decodeError(response.data) };
  }

  /** Error bodies of binary requests arrive as a `Buffer`; turn them back into JSON or text. */
  private static decodeError(data: unknown): unknown {
    if (!Buffer.isBuffer(data)) {
      return data;
    }
    const text = data.toString('utf8');
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}

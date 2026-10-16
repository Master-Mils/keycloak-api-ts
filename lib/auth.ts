import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

export type GrantType = 'client_credentials' | 'password' | 'refresh_token';

export interface Credentials {
  grantType: GrantType;
  clientId: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  totp?: string;
  /** Requests the `offline_access` scope. */
  offlineToken?: boolean;
  /** Required when `grantType` is `refresh_token`. */
  refreshToken?: string;
  /** Extra space-separated scopes. */
  scope?: string;
}

export interface TokenResponse {
  accessToken: string;
  tokenType?: string;
  idToken?: string;
  refreshToken?: string;
  /** Lifetime of the access token, in seconds. */
  expiresIn?: number;
  /** Lifetime of the refresh token, in seconds. */
  refreshExpiresIn?: number;
  /** Epoch milliseconds when the access token expires. */
  expiresAt?: number;
  sessionState?: string;
  scope?: string;
}

interface TokenResponseRaw {
  access_token: string;
  token_type?: string;
  id_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  session_state?: string;
  scope?: string;
}

/** Thrown when Keycloak refuses to issue a token. */
export class KeycloakAuthError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly error?: string,
    readonly errorDescription?: string,
  ) {
    super(message);
    this.name = 'KeycloakAuthError';
  }
}

/** Renew tokens this many milliseconds before they expire. */
const EXPIRY_SKEW_MS = 10_000;

interface TokenManagerOptions {
  baseUrl: string;
  realmName: string;
  credentials: Credentials;
  requestConfig?: AxiosRequestConfig;
  /** Renews the token in the background before it expires. */
  autoRefresh?: boolean;
}

/** Obtains, caches and renews access tokens from the Keycloak token endpoint. */
export class TokenManager {
  private token?: TokenResponse;
  /** Epoch ms after which the access / refresh token should be renewed. */
  private renewAt?: number;
  private refreshRenewAt?: number;
  private pending?: Promise<TokenResponse>;
  private timer?: NodeJS.Timeout;
  private readonly http: AxiosInstance;

  constructor(private readonly options: TokenManagerOptions) {
    this.http = axios.create(options.requestConfig);
  }

  get tokenUrl(): string {
    return `${this.options.baseUrl}/realms/${encodeURIComponent(this.options.realmName)}/protocol/openid-connect/token`;
  }

  get autoRefresh(): boolean {
    return !!this.options.autoRefresh;
  }

  set autoRefresh(flag: boolean) {
    this.options.autoRefresh = flag;
    if (flag) {
      this.schedule();
    } else {
      this.clearTimer();
    }
  }

  /** Returns a valid token, requesting or renewing it when needed. Concurrent callers share one request. */
  async getToken(): Promise<TokenResponse> {
    if (this.token && !TokenManager.isDue(this.renewAt)) {
      return this.token;
    }
    if (!this.pending) {
      this.pending = this.renew().finally(() => {
        this.pending = undefined;
      });
    }
    return this.pending;
  }

  /** Drops the cached access token so the next call requests a new one. */
  invalidate(): void {
    this.renewAt = 0;
  }

  dispose(): void {
    this.clearTimer();
    this.token = undefined;
    this.renewAt = undefined;
    this.refreshRenewAt = undefined;
  }

  private async renew(): Promise<TokenResponse> {
    const refreshToken = this.token?.refreshToken;
    if (refreshToken && !TokenManager.isDue(this.refreshRenewAt)) {
      try {
        return await this.request({ grant_type: 'refresh_token', refresh_token: refreshToken });
      } catch {
        // Session ended or refresh token revoked: fall back to a full grant.
      }
    }
    return this.request(this.grantParams());
  }

  private grantParams(): Record<string, string | undefined> {
    const c = this.options.credentials;
    const scope = [c.offlineToken ? 'offline_access' : undefined, c.scope].filter(Boolean).join(' ') || undefined;
    switch (c.grantType) {
      case 'password':
        return { grant_type: 'password', username: c.username, password: c.password, totp: c.totp, scope };
      case 'client_credentials':
        return { grant_type: 'client_credentials', scope };
      case 'refresh_token':
        if (!c.refreshToken) {
          throw new KeycloakAuthError('credentials.refreshToken is required for the refresh_token grant');
        }
        return { grant_type: 'refresh_token', refresh_token: c.refreshToken, scope };
      default:
        throw new KeycloakAuthError(`Unsupported grant type: ${String(c.grantType)}`);
    }
  }

  private async request(params: Record<string, string | undefined>): Promise<TokenResponse> {
    const { clientId, clientSecret } = this.options.credentials;
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...params, client_id: clientId })) {
      if (value !== undefined) {
        body.append(key, value);
      }
    }

    const config: AxiosRequestConfig = {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      ...(clientSecret ? { auth: { username: clientId, password: clientSecret } } : {}),
    };

    let raw: TokenResponseRaw;
    try {
      raw = (await this.http.post<TokenResponseRaw>(this.tokenUrl, body.toString(), config)).data;
    } catch (error) {
      throw TokenManager.toAuthError(error);
    }
    if (!raw?.access_token) {
      throw new KeycloakAuthError('Token endpoint returned no access_token');
    }

    const now = Date.now();
    this.token = {
      accessToken: raw.access_token,
      tokenType: raw.token_type,
      idToken: raw.id_token,
      refreshToken: raw.refresh_token,
      expiresIn: raw.expires_in,
      refreshExpiresIn: raw.refresh_expires_in,
      expiresAt: raw.expires_in ? now + raw.expires_in * 1000 : undefined,
      sessionState: raw.session_state,
      scope: raw.scope,
    };
    this.renewAt = TokenManager.renewTime(now, raw.expires_in);
    // refresh_expires_in = 0 means the refresh token does not expire (offline tokens).
    this.refreshRenewAt = TokenManager.renewTime(now, raw.refresh_expires_in);
    this.schedule();
    return this.token;
  }

  private schedule(): void {
    this.clearTimer();
    if (!this.options.autoRefresh || !this.renewAt) {
      return;
    }
    const delay = Math.max(this.renewAt - Date.now(), 1000);
    this.timer = setTimeout(() => {
      this.invalidate();
      this.getToken().catch(() => undefined);
    }, delay);
    // Never keep the process alive just to refresh a token.
    this.timer.unref?.();
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private static isDue(renewAt?: number): boolean {
    return renewAt !== undefined && Date.now() >= renewAt;
  }

  /** Renewal time: shortly before expiry, but never earlier than 3/4 of the lifetime. */
  private static renewTime(now: number, lifetimeSeconds?: number): number | undefined {
    if (!lifetimeSeconds) {
      return undefined;
    }
    const lifetime = lifetimeSeconds * 1000;
    return now + lifetime - Math.min(EXPIRY_SKEW_MS, lifetime / 4);
  }

  private static toAuthError(error: unknown): KeycloakAuthError {
    if (error instanceof AxiosError && error.response) {
      const data = error.response.data as { error?: string; error_description?: string } | undefined;
      return new KeycloakAuthError(
        `Keycloak token request failed (${error.response.status}): ${data?.error_description || data?.error || error.message}`,
        error.response.status,
        data?.error,
        data?.error_description,
      );
    }
    return new KeycloakAuthError(`Keycloak token request failed: ${(error as Error)?.message ?? String(error)}`);
  }
}

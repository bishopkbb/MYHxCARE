const REFRESH_TOKEN_KEY = 'mhx_rt';

// Access token lives only in memory — cleared on page reload.
// This is intentional: the silent-refresh flow (using the sessionStorage
// refresh token) rehydrates it on every new page load.
let _accessToken: string | null = null;

export const tokenStore = {
  getAccessToken(): string | null {
    return _accessToken;
  },

  setAccessToken(token: string): void {
    _accessToken = token;
  },

  clearAccessToken(): void {
    _accessToken = null;
  },

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken(token: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  clearAll(): void {
    _accessToken = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },
};

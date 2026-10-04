import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Shared axios instance.
 *
 * - `withCredentials` lets the httpOnly session cookie travel with every call.
 * - A request interceptor attaches the bearer token as a fallback for clients
 *   where cookies are blocked (useful in embedded previews).
 * - The response interceptor normalises every error into a single shape so
 *   components never have to inspect axios internals.
 */
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'nexus.token';
const SESSION_HINT_KEY = 'nexus.session';

/**
 * Session hint: a cheap localStorage flag that tells the app whether a session
 * *might* exist, so guests never fire an authenticated request on first paint.
 * The server remains the source of truth — a 401 clears the hint.
 */
export const sessionHint = {
  get: () => {
    try {
      return localStorage.getItem(SESSION_HINT_KEY) === '1';
    } catch {
      return false;
    }
  },
  set: (value) => {
    try {
      if (value) localStorage.setItem(SESSION_HINT_KEY, '1');
      else localStorage.removeItem(SESSION_HINT_KEY);
    } catch {
      /* ignore */
    }
  },
};

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY) || null;
    } catch {
      return null;
    }
  },
  set: (token) => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage disabled - cookie auth still works */
    }
  },
};

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Normalised error: { message, status, code, errors[], isNetworkError } */
export class ApiRequestError extends Error {
  constructor({ message, status, code, errors, isNetworkError = false }) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.errors = errors || [];
    this.isNetworkError = isNetworkError;
  }

  /** Field-level message lookup used by form components. */
  fieldError(field) {
    return this.errors.find((e) => e.field === field || e.field?.endsWith(`.${field}`))?.message || null;
  }
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      return Promise.reject(
        new ApiRequestError({
          message: offline
            ? 'You appear to be offline. Check your connection and try again.'
            : 'We could not reach the server. Please try again in a moment.',
          status: 0,
          code: 'NETWORK_ERROR',
          isNetworkError: true,
        }),
      );
    }

    const { status, data } = error.response;
    const message =
      data?.message ||
      (status === 401
        ? 'Please sign in to continue'
        : status === 403
          ? 'You do not have permission to do that'
          : status === 404
            ? 'We could not find what you were looking for'
            : status >= 500
              ? 'Something went wrong on our end. Please try again.'
              : 'Request failed');

    return Promise.reject(
      new ApiRequestError({ message, status, code: data?.code, errors: data?.errors || [] }),
    );
  },
);

/** Unwraps `{ success, data }` envelopes and returns `data`. */
export const unwrap = (promise) => promise.then((res) => res.data?.data ?? res.data);

export default api;

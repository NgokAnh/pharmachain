const DEFAULT_API_BASE_URL = 'http://localhost:3000/api';

const normalizeApiBaseUrl = (value?: string) => (value ? value.replace(/\/$/, '') : DEFAULT_API_BASE_URL);

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

export const apiUrl = (path: string) => {
  if (!path) {
    return API_BASE_URL;
  }

  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};
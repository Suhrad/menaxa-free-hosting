const DEFAULT_API_BASE_URL = "http://localhost:8000";

const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
export const API_BASE_URL =
  (typeof rawApiBaseUrl === "string" ? rawApiBaseUrl.trim() : "") || DEFAULT_API_BASE_URL;

export const apiUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

export const ADMIN_KEY_STORAGE = 'raznesi_admin_key';

export class AdminApiError extends Error {
  status: number;
  constructor(status: number) {
    super(`http_${status}`);
    this.status = status;
  }
}

export async function adminFetch<T>(path: string, key: string): Promise<T> {
  if (!API_URL) throw new Error('VITE_API_URL is not set');
  const res = await fetch(`${API_URL}${path}`, { headers: { 'X-Admin-Key': key } });
  if (!res.ok) throw new AdminApiError(res.status);
  return res.json() as Promise<T>;
}

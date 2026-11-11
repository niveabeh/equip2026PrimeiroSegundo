let token = sessionStorage.getItem('cjr-token') || '';
export function setToken(value: string) {
  token = value;
  if (value) sessionStorage.setItem('cjr-token', value);
  else sessionStorage.removeItem('cjr-token');
}
export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch('/api' + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login') {
      setToken('');
      window.dispatchEvent(new Event('session-expired'));
    }
    throw new Error(data.error || 'Falha ao acessar o servidor.');
  }
  return data;
}
export const send = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

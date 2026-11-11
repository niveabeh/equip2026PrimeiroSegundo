import { api, send, setToken } from '../../shared/api';
import type { User } from '../../entities/models';
import { user } from '../../entities/session';
export { user, canManage, isAdmin } from '../../entities/session';
export async function login(email: string, password: string) {
  const data = await api<{ token: string; user: User }>(
    '/auth/login',
    send('POST', { email, password }),
  );
  setToken(data.token);
  user.value = data.user;
}
export async function restore() {
  if (!sessionStorage.getItem('cjr-token')) return;
  try {
    user.value = await api<User>('/me');
  } catch {
    logout();
  }
}
export function logout() {
  setToken('');
  user.value = null;
}

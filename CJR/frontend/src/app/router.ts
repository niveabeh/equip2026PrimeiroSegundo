import { createRouter, createWebHistory } from 'vue-router';
import { user, restore } from '../features/auth/model';
import { loadEditions } from '../entities/edition';
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      component: () => import('../pages/LoginPage.vue'),
      meta: { title: 'Entrar' },
    },
    {
      path: '/',
      component: () => import('../pages/DashboardPage.vue'),
      meta: { title: 'Painel da edição' },
    },
    {
      path: '/atividades',
      component: () => import('../pages/ActivitiesPage.vue'),
      meta: { title: 'Atividades e decisões' },
    },
    {
      path: '/historico',
      component: () => import('../pages/HistoryPage.vue'),
      meta: { title: 'Histórico de edições' },
    },
    {
      path: '/envolvidos',
      component: () => import('../pages/StakeholdersPage.vue'),
      meta: { title: 'Envolvidos' },
    },
    {
      path: '/auditoria',
      component: () => import('../pages/AuditPage.vue'),
      meta: { title: 'Trilha de auditoria' },
    },
    {
      path: '/usuarios',
      component: () => import('../pages/UsersPage.vue'),
      meta: { title: 'Usuários e permissões', admin: true },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});
let initialized = false;
router.beforeEach(async (to) => {
  if (!initialized) {
    await restore();
    if (user.value) {
      try {
        await loadEditions();
      } catch {
        /* Pages expose retry on API failures. */
      }
    }
    initialized = true;
  }
  if (!user.value && to.path !== '/login') return '/login';
  if (user.value && to.path === '/login') return '/';
  if (to.meta.admin && user.value?.role !== 'admin') return '/';
});
router.afterEach((to) => {
  document.title = String(to.meta.title || 'CJR') + ' • CJR';
  setTimeout(() => document.getElementById('main')?.focus(), 0);
});
window.addEventListener('session-expired', () => {
  user.value = null;
  router.push('/login');
});

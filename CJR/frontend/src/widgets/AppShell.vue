<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import {
  LayoutDashboard,
  ListChecks,
  History,
  Users,
  ShieldCheck,
  ScrollText,
  LogOut,
  Menu,
  Bot,
  ChevronRight,
  GitBranch,
  Handshake,
  Type,
} from 'lucide-vue-next';
import { user, logout, isAdmin } from '../features/auth/model';
import { editions, selectedId, selectEdition } from '../entities/edition';
import { labels } from '../shared/format';
import { largeText, toggleTextSize } from '../features/reading/model';
const router = useRouter(),
  open = ref(false);
const mobileMedia = window.matchMedia('(max-width: 720px)');
const mobile = ref(mobileMedia.matches);
const sidebar = ref<HTMLElement | null>(null);
const menuButton = ref<HTMLButtonElement | null>(null);
const updateMobile = () => {
  mobile.value = mobileMedia.matches;
};
onMounted(() => mobileMedia.addEventListener('change', updateMobile));
onBeforeUnmount(() => mobileMedia.removeEventListener('change', updateMobile));
async function toggleMenu() {
  open.value = !open.value;
  if (open.value) {
    await nextTick();
    sidebar.value?.querySelector<HTMLAnchorElement>('nav a')?.focus();
  }
}
function closeMenu() {
  open.value = false;
  menuButton.value?.focus();
}
const links = [
  { to: '/', label: 'Painel da edição', icon: LayoutDashboard },
  { to: '/auditoria', label: 'Trilha de auditoria', icon: GitBranch },
  { to: '/atividades', label: 'Atividades e decisões', icon: ListChecks },
  { to: '/patrocinadores', label: 'Patrocinadores', icon: Handshake },
  { to: '/historico', label: 'Histórico de edições', icon: History },
  { to: '/envolvidos', label: 'Envolvidos na operação', icon: Users },
];
function exit() {
  logout();
  router.push('/login');
}
</script>
<template>
  <a class="skip-link" href="#main">Pular para o conteúdo</a>
  <div class="app-shell">
    <aside
      ref="sidebar"
      class="sidebar"
      :class="{ open }"
      :inert="mobile && !open"
      @keydown.esc="closeMenu"
    >
      <RouterLink to="/" class="brand"
        ><span class="brand-icon"><Bot :size="25" /></span
        ><span>CJR<span class="brand-sub">GESTÃO • ROBÓTICA</span></span></RouterLink
      >
      <div class="workspace-tag"><span class="live-dot" />Dados de demonstração</div>
      <p class="nav-caption">ORGANIZAÇÃO</p>
      <nav aria-label="Navegação principal">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to" @click="open = false"
          ><component :is="link.icon" :size="19" />{{ link.label }}</RouterLink
        ><RouterLink v-if="isAdmin" to="/usuarios" @click="open = false"
          ><ShieldCheck :size="19" />Usuários e permissões</RouterLink
        >
      </nav>
      <RouterLink to="/auditoria" class="sidebar-promo" @click="open = false"
        ><GitBranch :size="20" /><span
          ><small>Memória do evento</small><strong>Quem mudou e por quê.</strong
          ><em>Consultar a trilha de auditoria</em></span
        ></RouterLink
      >
      <div class="sidebar-bottom">
        <p>Prefeitura de Joinville<br />Campeonato Joinvilense de Robótica</p>
        <small>Protótipo acadêmico · dados fictícios</small>
      </div>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <button
          ref="menuButton"
          class="icon-button mobile-menu"
          :aria-expanded="open"
          aria-label="Alternar menu"
          @click="toggleMenu"
        >
          <Menu /></button
        ><span class="breadcrumb"
          >Organização <ChevronRight :size="14" /> <strong>Área administrativa</strong></span
        >
        <button class="reading-toggle" :aria-pressed="largeText" @click="toggleTextSize">
          <Type :size="20" aria-hidden="true" />Texto maior
        </button>
        <div class="user-menu">
          <span class="avatar" :title="user?.name">{{ user?.name.charAt(0) }}</span><span
            class="user-info"
            ><strong>{{ user?.name }}</strong
            ><small>{{ labels[user?.role || ''] }}</small></span
          ><button class="icon-button" aria-label="Sair da conta" @click="exit">
            <LogOut :size="19" />
          </button>
        </div>
      </header>
      <div class="edition-bar">
        <label for="edition-select">Edição em foco</label
        ><select
          id="edition-select"
          :value="selectedId"
          @change="selectEdition(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="e in editions" :value="e.id" :key="e.id">{{ e.name }}</option></select
        ><span class="demo-pill">Dados 100% fictícios</span>
      </div>
      <main id="main" tabindex="-1"><slot /></main>
      <footer class="footer">
        CJR · Desafio 01 — Gestão do Evento <span>Organização. Rastreabilidade. Continuidade.</span>
      </footer>
    </div>
  </div>
</template>

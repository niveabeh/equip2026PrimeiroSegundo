<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  ArrowUpRight,
  CalendarDays,
  MapPin,
  CheckCheck,
  ClipboardList,
  Clock3,
  ArrowRight,
  Flag,
} from 'lucide-vue-next';
import { api } from '../shared/api';
import { selectedId, selectedEdition } from '../entities/edition';
import type { Activity, Decision, Audit } from '../entities/models';
import { labels, formatDate, isOverdue } from '../shared/format';
import PageState from '../shared/PageState.vue';
const tasks = ref<Activity[]>([]),
  decisions = ref<Decision[]>([]),
  audit = ref<Audit[]>([]),
  loading = ref(false),
  error = ref('');
const done = computed(() => tasks.value.filter((a) => a.status === 'done').length),
  progress = computed(() =>
    tasks.value.length ? Math.round((done.value / tasks.value.length) * 100) : 0,
  ),
  pending = computed(() => tasks.value.filter((a) => a.status !== 'done')),
  overdue = computed(() => tasks.value.filter((a) => isOverdue(a.due_date, a.status)).length);
async function load() {
  if (!selectedId.value) return;
  loading.value = true;
  error.value = '';
  try {
    [tasks.value, decisions.value, audit.value] = await Promise.all([
      api('/editions/' + selectedId.value + '/activities'),
      api('/editions/' + selectedId.value + '/decisions'),
      api('/editions/' + selectedId.value + '/audit'),
    ]);
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
watch(selectedId, load, { immediate: true });
</script>
<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">VISÃO GERAL</p>
      <h1>Painel da edição</h1>
      <p class="muted">Tudo o que a equipe precisa para seguir em frente.</p>
    </div>
    <RouterLink to="/atividades" class="primary"
      >Gerenciar atividades <ArrowUpRight :size="17"
    /></RouterLink>
  </div>
  <PageState :loading="loading" :error="error" @retry="load"
    ><template v-if="selectedEdition"
      ><section class="edition-hero">
        <div>
          <span class="hero-tag"
            ><span class="live-dot" />{{ labels[selectedEdition.status] }}</span
          >
          <h2>{{ selectedEdition.name }}</h2>
          <p>Campeonato Joinvilense de Robótica</p>
          <div class="hero-meta">
            <span><CalendarDays :size="16" />{{ formatDate(selectedEdition.event_date) }}</span
            ><span><MapPin :size="16" />{{ selectedEdition.location }}</span>
          </div>
        </div>
        <div class="hero-progress">
          <span class="progress-number">{{ progress }}<small>%</small></span
          ><span>das atividades concluídas</span>
          <div class="progress-track"><span :style="{ width: progress + '%' }" /></div>
          <small>{{ done }} de {{ tasks.length }} atividades</small>
        </div>
      </section>
      <div class="stats-grid">
        <article class="stat-card">
          <span class="stat-icon blue"><ClipboardList /></span
          ><span class="stat-label">Atividades no total</span><strong>{{ tasks.length }}</strong
          ><small>Organização centralizada</small>
        </article>
        <article class="stat-card">
          <span class="stat-icon green"><CheckCheck /></span
          ><span class="stat-label">Concluídas</span><strong>{{ done }}</strong
          ><small>Etapas que já avançaram</small>
        </article>
        <article class="stat-card">
          <span class="stat-icon amber"><Clock3 /></span
          ><span class="stat-label">Precisam de atenção</span><strong>{{ overdue }}</strong
          ><small>Prazos vencidos, ainda abertas</small>
        </article>
        <article class="stat-card">
          <span class="stat-icon violet"><Flag /></span
          ><span class="stat-label">Decisões registradas</span
          ><strong>{{ decisions.length }}</strong
          ><small>Contexto para o futuro</small>
        </article>
      </div>
      <div class="dashboard-grid">
        <section class="card">
          <div class="section-head">
            <div>
              <h2>Próximos passos</h2>
              <p class="muted">Responsabilidades que movem a edição.</p>
            </div>
            <RouterLink to="/atividades" class="text-link"
              >Ver todas <ArrowRight :size="16"
            /></RouterLink>
          </div>
          <div v-if="!pending.length" class="empty">Nenhuma atividade pendente nesta edição.</div>
          <article v-for="a in pending.slice(0, 4)" :key="a.id" class="task-row">
            <span class="task-check" />
            <div>
              <RouterLink to="/atividades" class="task-title">{{ a.title }}</RouterLink
              ><small>{{ a.owner_name }} · {{ formatDate(a.due_date) }}</small>
            </div>
            <span class="badge" :class="a.status">{{ labels[a.status] }}</span>
          </article>
        </section>
        <section class="card decision-preview">
          <span class="section-kicker">MEMÓRIA DA ORGANIZAÇÃO</span>
          <h2>A decisão tem contexto.</h2>
          <p class="muted">Preserve o motivo, além do resultado.</p>
          <template v-if="decisions[0]"
            ><h3>{{ decisions[0].title }}</h3>
            <p>{{ decisions[0].rationale }}</p>
            <small>{{ decisions[0].author_name }}</small></template
          >
          <p v-else class="empty">Nenhuma decisão registrada.</p>
          <RouterLink to="/atividades" class="text-link"
            >Consultar decisões <ArrowRight :size="16"
          /></RouterLink>
        </section>
      </div>
      <section class="card recent">
        <div class="section-head">
          <div>
            <h2>Rastro de continuidade</h2>
            <p class="muted">Quem fez, o que mudou e quando.</p>
          </div>
          <RouterLink to="/auditoria" class="text-link"
            >Abrir auditoria <ArrowRight :size="16"
          /></RouterLink>
        </div>
        <p v-if="!audit.length" class="empty">As próximas alterações aparecerão aqui.</p>
        <div v-for="item in audit.slice(0, 3)" :key="item.id" class="audit-row">
          <span class="timeline-dot" />
          <p>
            <strong>{{ item.actor_name }}</strong> · {{ labels[item.action] || item.action }} de
            {{ labels[item.entity_type] || item.entity_type
            }}<small>{{ formatDate(item.created_at) }}</small>
          </p>
        </div>
      </section></template
    >
    <div v-else class="empty card">
      Nenhuma edição disponível. Solicite um vínculo ao administrador.
    </div></PageState
  >
</template>

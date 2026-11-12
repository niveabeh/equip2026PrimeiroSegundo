<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  ArrowUpRight,
  CalendarDays,
  MapPin,
  ClipboardList,
  GitBranch,
  Handshake,
  Users,
  ArrowRight,
  ShieldCheck,
} from 'lucide-vue-next';
import { api } from '../shared/api';
import { selectedId, selectedEdition } from '../entities/edition';
import type { Activity, Decision, Audit, Sponsor, Stakeholder } from '../entities/models';
import { labels, formatDate } from '../shared/format';
import { auditTitle } from '../entities/audit';
import PageState from '../shared/PageState.vue';
import RoboticsMark from '../shared/RoboticsMark.vue';
import { useFitPageSize } from '../shared/useViewport';
const tasks = ref<Activity[]>([]),
  decisions = ref<Decision[]>([]),
  audit = ref<Audit[]>([]),
  sponsors = ref<Sponsor[]>([]),
  people = ref<Stakeholder[]>([]),
  loading = ref(false),
  error = ref(''),
  panel = ref('trail');
const { region: fitRegion, size } = useFitPageSize(160, 104, 3);
const done = computed(() => tasks.value.filter((a) => a.status === 'done').length),
  progress = computed(() =>
    tasks.value.length ? Math.round((done.value / tasks.value.length) * 100) : 0,
  ),
  pending = computed(() =>
    tasks.value
      .filter((a) => a.status !== 'done')
      .sort((a, b) => a.due_date.localeCompare(b.due_date)),
  ),
  recent = computed(() => audit.value.filter((a) => a.action !== 'seed').slice(0, size.value));
async function load() {
  if (!selectedId.value) return;
  loading.value = true;
  error.value = '';
  try {
    [tasks.value, decisions.value, audit.value, sponsors.value, people.value] = await Promise.all(
      ['activities', 'decisions', 'audit', 'sponsors', 'stakeholders'].map((path) =>
        api('/editions/' + selectedId.value + '/' + path),
      ),
    );
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
watch(selectedId, load, { immediate: true });
</script>
<template>
  <section class="page-view dashboard-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">Visão geral da organização</p>
        <h1>Painel da edição<span class="heading-dot">.</span></h1>
        <p class="muted">Organização conectada. Conhecimento que atravessa edições.</p>
      </div>
      <RouterLink class="primary" to="/auditoria"
        ><GitBranch :size="17" />Abrir trilha de auditoria<ArrowUpRight :size="15"
      /></RouterLink>
    </header>
    <PageState :loading="loading" :error="error" @retry="load"
      ><template v-if="selectedEdition"
        ><section class="mission-panel">
          <div class="edition-identity">
            <span class="hero-tag"
              ><span class="live-dot" />{{ labels[selectedEdition.status] }}</span
            >
            <h2>{{ selectedEdition.name }}</h2>
            <div class="hero-meta">
              <span><CalendarDays :size="13" />{{ formatDate(selectedEdition.event_date) }}</span
              ><span><MapPin :size="13" />{{ selectedEdition.location }}</span>
            </div>
            <div class="edition-progress">
              <div class="progress-track"><span :style="{ width: progress + '%' }" /></div>
              <small>{{ progress }}% concluído · {{ done }}/{{ tasks.length }} atividades</small>
            </div>
          </div>
          <div class="mission-copy">
            <span class="section-kicker">RASTREABILIDADE É CONTINUIDADE</span>
            <h2>A equipe muda.<br />A memória fica.</h2>
            <RouterLink to="/auditoria"
              >Conheça a história de cada mudança<ArrowUpRight :size="14"
            /></RouterLink>
          </div>
          <RoboticsMark />
        </section>
        <div class="metric-grid">
          <RouterLink to="/atividades" class="metric-card"
            ><span class="stat-icon blue"><ClipboardList :size="19" /></span>
            <div>
              <span>Atividades</span
              ><strong
                >{{ tasks.length }}<small>{{ pending.length }} em aberto</small></strong
              >
            </div>
            <ArrowUpRight :size="15" /></RouterLink
          ><RouterLink to="/atividades" class="metric-card"
            ><span class="stat-icon violet"><GitBranch :size="19" /></span>
            <div>
              <span>Decisões</span
              ><strong>{{ decisions.length }}<small>contextos preservados</small></strong>
            </div>
            <ArrowUpRight :size="15" /></RouterLink
          ><RouterLink to="/patrocinadores" class="metric-card"
            ><span class="stat-icon cyan"><Handshake :size="19" /></span>
            <div>
              <span>Patrocinadores</span
              ><strong
                >{{ sponsors.length
                }}<small
                  >{{
                    sponsors.filter((s) => ['confirmed', 'delivered'].includes(s.status)).length
                  }}
                  apoios confirmados</small
                ></strong
              >
            </div>
            <ArrowUpRight :size="15" /></RouterLink
          ><RouterLink to="/envolvidos" class="metric-card"
            ><span class="stat-icon amber"><Users :size="19" /></span>
            <div>
              <span>Envolvidos</span
              ><strong>{{ people.length }}<small>responsabilidades claras</small></strong>
            </div>
            <ArrowUpRight :size="15"
          /></RouterLink>
        </div>
        <div class="mobile-lanes">
          <button :class="{ active: panel === 'trail' }" @click="panel = 'trail'">
            Memória viva</button
          ><button :class="{ active: panel === 'tasks' }" @click="panel = 'tasks'">
            Próximos passos</button
          ><button :class="{ active: panel === 'decisions' }" @click="panel = 'decisions'">
            Decisões
          </button>
        </div>
        <div ref="fitRegion" class="dashboard-workbench page-region">
          <section
            class="surface-panel dashboard-tasks"
            :class="{ 'mobile-active': panel === 'tasks' }"
          >
            <header class="panel-heading">
              <h2>Próximos passos</h2>
              <RouterLink class="text-link" to="/atividades"
                >Quadro<ArrowUpRight :size="13"
              /></RouterLink>
            </header>
            <div class="dashboard-rows">
              <RouterLink
                v-for="a in pending.slice(0, size)"
                :key="a.id"
                :to="{ path: '/atividades', query: { ref: a.id } }"
                class="overview-task"
                ><span class="task-indicator" :class="a.priority" />
                <div>
                  <strong class="clamp-two">{{ a.title }}</strong><small
                    >{{ a.owner_name }} · {{ formatDate(a.due_date) }}</small
                  >
                </div>
                <span class="badge" :class="a.status">{{ labels[a.status] }}</span></RouterLink
              >
              <p v-if="!pending.length" class="empty">Nenhuma pendência nesta edição.</p>
            </div>
            <footer class="panel-note">Responsável + prazo + etapa do evento.</footer>
          </section>
          <section
            class="surface-panel dashboard-decisions"
            :class="{ 'mobile-active': panel === 'decisions' }"
          >
            <header class="panel-heading">
              <h2>Escolhas com contexto</h2>
              <GitBranch :size="16" />
            </header>
            <div class="dashboard-rows">
              <RouterLink
                v-for="d in decisions.slice(0, size)"
                :key="d.id"
                :to="{ path: '/auditoria', query: { ref: d.id } }"
                class="overview-decision"
                ><strong class="clamp-two">{{ d.title }}</strong>
                <p class="clamp-two">{{ d.rationale }}</p>
                <small>{{ d.author_name }}</small></RouterLink
              >
              <p v-if="!decisions.length" class="empty">As decisões da equipe aparecerão aqui.</p>
            </div>
            <footer class="panel-note">O motivo permanece com a informação.</footer>
          </section>
          <section
            class="surface-panel dashboard-trail"
            :class="{ 'mobile-active': panel === 'trail' }"
          >
            <header class="panel-heading">
              <h2><GitBranch :size="17" />Memória viva</h2>
              <span class="live-dot" />
            </header>
            <div class="dashboard-rows">
              <RouterLink
                v-for="a in recent"
                :key="a.id"
                class="overview-trail"
                :to="{ path: '/auditoria', query: { ref: a.entity_id } }"
                ><span class="trail-mini-node" />
                <div>
                  <span>{{ labels[a.action] }} · {{ labels[a.entity_type] }}</span
                  ><strong class="truncate">{{ auditTitle(a) }}</strong
                  ><small>{{ a.actor_name }} · {{ formatDate(a.created_at) }}</small>
                </div>
                <ArrowUpRight :size="13"
              /></RouterLink>
              <p v-if="!recent.length" class="empty">Registre atividades para iniciar a trilha.</p>
            </div>
            <RouterLink to="/auditoria" class="trail-panel-footer"
              >Explore antes, depois e autoria<ArrowRight :size="15"
            /></RouterLink>
          </section>
        </div>
        <div class="page-caption">
          <span><ShieldCheck :size="12" />Dados fictícios · ambiente administrativo</span
          ><span>Campeonato Joinvilense de Robótica · Prefeitura de Joinville</span>
        </div></template
      >
      <div v-else class="surface-panel empty">
        Nenhuma edição disponível. Solicite um vínculo ao administrador.
      </div></PageState
    >
  </section>
</template>

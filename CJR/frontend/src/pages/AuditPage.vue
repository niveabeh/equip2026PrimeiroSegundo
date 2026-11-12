<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  GitBranch,
  ShieldCheck,
  Search,
  ArrowUpRight,
  RefreshCw,
  ArrowRight,
  FilePlus2,
  History,
  Download,
  UserRound,
} from 'lucide-vue-next';
import { selectedId, selectedEdition } from '../entities/edition';
import { api } from '../shared/api';
import type { Audit, User, Activity, Stakeholder } from '../entities/models';
import { auditTitle, auditChanges, displayValue } from '../entities/audit';
import { labels, formatDate } from '../shared/format';
import PageState from '../shared/PageState.vue';
import Pagination from '../shared/Pagination.vue';
import RoboticsMark from '../shared/RoboticsMark.vue';
import Modal from '../shared/Modal.vue';
import { useFitPageSize } from '../shared/useViewport';
const route = useRoute(),
  items = ref<Audit[]>([]),
  names = ref<Record<string, string>>({}),
  loading = ref(false),
  error = ref(''),
  search = ref(String(route.query.ref || '')),
  entity = ref(''),
  actor = ref(''),
  action = ref(''),
  page = ref(1),
  fieldPage = ref(1),
  picked = ref<number>(),
  mobileDetail = ref(false),
  raw = ref(false);
const { region: fitRegion, size } = useFitPageSize(106, 104, 7);
const { region: fieldRegion, size: fieldSize } = useFitPageSize(122, 10, 4);
const filtered = computed(() =>
  items.value.filter(
    (a) =>
      (!entity.value || a.entity_type === entity.value) &&
      (!actor.value || a.actor_name === actor.value) &&
      (!action.value || a.action === action.value) &&
      [a.entity_id, a.actor_name, auditTitle(a), labels[a.entity_type], labels[a.action]]
        .join(' ')
        .toLowerCase()
        .includes(search.value.toLowerCase()),
  ),
);
const current = computed(() => filtered.value.find((a) => a.id === picked.value));
const rows = computed(() =>
  filtered.value.slice((page.value - 1) * size.value, page.value * size.value),
);
const changes = computed(() => (current.value ? auditChanges(current.value) : [])),
  fields = computed(() =>
    changes.value.slice((fieldPage.value - 1) * fieldSize.value, fieldPage.value * fieldSize.value),
  );
const authors = computed(() => [...new Set(items.value.map((a) => a.actor_name))]),
  types = computed(() => [...new Set(items.value.map((a) => a.entity_type))]);
const context = computed(() =>
  current.value?.entity_type === 'sponsor'
    ? '/patrocinadores'
    : ['activity', 'decision'].includes(current.value?.entity_type || '')
      ? '/atividades'
      : current.value?.entity_type === 'stakeholder'
        ? '/envolvidos'
        : '/historico',
);
const time = (s: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(s));
watch([search, entity, actor, action], () => {
  page.value = 1;
  mobileDetail.value = false;
});
watch(filtered, (list) => {
  if (!list.some((a) => a.id === picked.value)) {
    picked.value = (list.find((a) => a.action === 'update') || list[0])?.id;
    fieldPage.value = 1;
  }
});
function select(a: Audit) {
  picked.value = a.id;
  fieldPage.value = 1;
  mobileDetail.value = true;
}
async function load() {
  if (!selectedId.value) return;
  loading.value = true;
  error.value = '';
  try {
    const [records, members, tasks, stakeholders] = await Promise.all([
      api<Audit[]>('/editions/' + selectedId.value + '/audit'),
      api<User[]>('/editions/' + selectedId.value + '/members'),
      api<Activity[]>('/editions/' + selectedId.value + '/activities'),
      api<Stakeholder[]>('/editions/' + selectedId.value + '/stakeholders'),
    ]);
    items.value = records;
    names.value = Object.fromEntries([
      ...members.map((u) => [u.id, u.name]),
      ...tasks.map((a) => [a.id, a.title]),
      ...stakeholders.map((s) => [s.id, s.name]),
    ]);
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
watch(
  selectedId,
  (next, previous) => {
    if (previous && next !== previous) {
      search.value = '';
      actor.value = '';
      entity.value = '';
      action.value = '';
    }
    picked.value = undefined;
    page.value = 1;
    mobileDetail.value = false;
    load();
  },
  { immediate: true },
);
function exportRecords() {
  const content = JSON.stringify(
    {
      edition: selectedEdition.value?.name,
      exported_at: new Date().toISOString(),
      notice:
        'Dados fictícios de demonstração. Inclui somente os registros carregados e filtrados, até 200.',
      records: filtered.value,
    },
    null,
    2,
  );
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'CJR-trilha-' + selectedId.value + '.json';
  link.click();
  URL.revokeObjectURL(url);
}
</script>
<template>
  <section class="page-view audit-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">Histórico de alterações</p>
        <h1>Trilha de auditoria<span class="heading-dot">.</span></h1>
        <p class="muted">Quem mudou. O que mudou. O contexto que permanece.</p>
      </div>
      <div class="heading-actions">
        <button class="secondary" @click="exportRecords" :disabled="!filtered.length">
          <Download :size="15" />Exportar consulta</button
        ><button class="primary" @click="load" :disabled="loading">
          <RefreshCw :size="15" />Atualizar trilha
        </button>
      </div>
    </header>
    <section class="audit-banner">
      <div class="audit-emblem"><GitBranch :size="29" /></div>
      <div>
        <span class="section-kicker">CADA EDIÇÃO DEIXA CONHECIMENTO</span>
        <h2>Toda mudança tem uma história.</h2>
        <p>
          Conecte pessoas, escolhas e responsabilidades. A próxima equipe continua de onde vocês
          pararam.
        </p>
      </div>
      <RoboticsMark /><span class="preservation-chip"
        ><ShieldCheck :size="15" />Histórico preservado</span
      >
    </section>
    <div class="audit-metrics">
      <span
        ><strong>{{ items.length }}</strong> registros nesta consulta</span
      ><span
        ><strong>{{ authors.length }}</strong> pessoas na trilha</span
      ><span
        ><strong>{{ items.filter((a) => a.entity_type === 'decision').length }}</strong> decisões
        rastreáveis</span
      ><span class="metric-note"><ShieldCheck :size="13" />Alteração + log na mesma transação</span>
    </div>
    <div class="audit-toolbar">
      <label class="search"
        ><Search :size="16" /><input
          v-model="search"
          aria-label="Buscar na trilha"
          placeholder="Buscar contexto, pessoa ou referência" /></label
      ><select v-model="entity" aria-label="Tipo de registro">
        <option value="">Todos os registros</option>
        <option v-for="t in types" :key="t" :value="t">{{ labels[t] || t }}</option></select
      ><select v-model="actor" aria-label="Pessoa responsável pela mudança">
        <option value="">Todas as pessoas</option>
        <option v-for="a in authors" :key="a">{{ a }}</option></select
      ><select v-model="action" aria-label="Tipo de mudança">
        <option value="">Todas as ações</option>
        <option value="create">Criação</option>
        <option value="update">Atualização</option>
        <option value="status">Situação alterada</option>
        <option value="assign">Vínculo</option>
        <option value="seed">Base inicial</option>
      </select>
    </div>
    <PageState :loading="loading" :error="error" @retry="load"
      ><div
        ref="fitRegion"
        class="audit-workbench page-region"
        :class="{ 'show-detail': mobileDetail }"
      >
        <section class="trail-panel">
          <header class="panel-heading">
            <h2><History :size="16" />Linha do tempo</h2>
            <small>{{ filtered.length }} registro(s)</small>
          </header>
          <div class="trail-entries">
            <button
              v-for="a in rows"
              :key="a.id"
              class="trail-entry"
              :class="{ selected: current?.id === a.id }"
              @click="select(a)"
            >
              <span class="trail-node" :class="a.action"
                ><GitBranch v-if="a.action === 'update'" :size="15" /><FilePlus2
                  v-else
                  :size="15" /></span
              ><span class="trail-entry-copy"
                ><span class="trail-type"
                  >{{ labels[a.action] || a.action }} ·
                  {{ labels[a.entity_type] || a.entity_type }}</span
                ><strong class="truncate">{{ auditTitle(a) }}</strong
                ><small class="truncate">{{ a.actor_name }} · {{ time(a.created_at) }}</small></span
              ><ArrowUpRight :size="14" />
            </button>
            <p v-if="!filtered.length" class="empty">Nenhum registro corresponde aos filtros.</p>
          </div>
          <Pagination
            v-model:page="page"
            :total="filtered.length"
            :size="size"
            label="Linha do tempo"
          />
        </section>
        <section class="change-panel" v-if="current">
          <header class="change-heading">
            <button class="text-link mobile-back" @click="mobileDetail = false">
              ← Voltar à linha do tempo</button
            ><span class="section-kicker"
              >{{ labels[current.entity_type] || current.entity_type }} /
              {{ labels[current.action] || current.action }}</span
            >
            <h2>{{ auditTitle(current) }}</h2>
            <div class="change-person">
              <span class="mini-avatar"><UserRound :size="13" /></span
              ><strong>{{ current.actor_name }}</strong
              ><span
                >· {{ formatDate(current.created_at) }}
                {{
                  new Date(current.created_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                }}</span
              >
            </div>
          </header>
          <div class="change-context">
            <GitBranch :size="15" />
            <p>
              {{
                current.action === 'create'
                  ? 'Um novo registro passou a fazer parte da memória da edição.'
                  : current.action === 'update'
                    ? 'A informação evoluiu. O estado anterior continua registrado.'
                    : 'Contexto administrativo registrado para a continuidade.'
              }}
            </p>
          </div>
          <div class="comparison-labels">
            <span>ANTES</span><ArrowRight :size="14" /><span>DEPOIS</span>
          </div>
          <div ref="fieldRegion" class="human-diffs">
            <article v-for="field in fields" :key="field.key" class="human-diff">
              <h3>{{ field.label }}</h3>
              <div>
                <p :title="displayValue(field.key, field.before, names)">
                  {{ displayValue(field.key, field.before, names) }}
                </p>
                <ArrowRight :size="13" />
                <p :title="displayValue(field.key, field.after, names)">
                  {{ displayValue(field.key, field.after, names) }}
                </p>
              </div>
            </article>
            <p v-if="!changes.length" class="empty">
              Registro de contexto sem alteração de campos administrativos.
            </p>
          </div>
          <Pagination
            v-model:page="fieldPage"
            :total="changes.length"
            :size="fieldSize"
            label="Campos da alteração"
          />
          <footer class="change-footer">
            <span
              >#{{ current.id }} ·
              {{
                current.source === 'demo'
                  ? 'Cenário fictício de demonstração'
                  : 'Registrado pelo sistema'
              }}</span
            >
            <div>
              <button class="text-link" @click="raw = true">Ver registro completo</button
              ><RouterLink
                class="text-link"
                :to="{ path: context, query: { ref: current.entity_id } }"
                >Abrir contexto<ArrowUpRight :size="13"
              /></RouterLink>
            </div>
          </footer>
        </section>
        <section v-else class="change-panel empty">
          <GitBranch :size="35" />
          <h2>A memória começa com o primeiro registro.</h2>
          <p>Selecione outra edição ou registre uma atividade.</p>
        </section>
      </div></PageState
    >
    <div class="page-caption">
      <span>{{ selectedEdition?.name }}</span><span
        >Até 200 registros recentes · sem edição pela interface ou API</span
      >
    </div>
    <Modal v-if="raw && current" title="Registro completo da alteração" wide @close="raw = false"
      ><h2>{{ auditTitle(current) }}</h2>
      <p class="form-intro">
        Referência {{ current.entity_id }} ·
        {{
          current.source === 'demo'
            ? 'Cenário fictício carregado no seed.'
            : 'Registro de uma operação no sistema.'
        }}
      </p>
      <div class="audit-diff">
        <section>
          <h3>Antes</h3>
          <pre>{{ JSON.stringify(current.before_data, null, 2) || 'Sem registro anterior' }}</pre>
        </section>
        <section>
          <h3>Depois</h3>
          <pre>{{ JSON.stringify(current.after_data, null, 2) }}</pre>
        </section>
      </div></Modal
    >
  </section>
</template>

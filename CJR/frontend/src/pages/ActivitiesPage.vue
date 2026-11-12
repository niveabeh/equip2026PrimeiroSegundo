<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  Plus,
  Search,
  GripVertical,
  GitBranch,
  LockKeyhole,
  ArrowUpRight,
  CalendarDays,
} from 'lucide-vue-next';
import { api, send } from '../shared/api';
import { selectedId, selectedEdition } from '../entities/edition';
import type { Activity, Decision, Stakeholder } from '../entities/models';
import { labels, formatDate } from '../shared/format';
import { user, canManage } from '../features/auth/model';
import ActivityEditor from '../features/activities/ActivityEditor.vue';
import PageState from '../shared/PageState.vue';
import Modal from '../shared/Modal.vue';
import Pagination from '../shared/Pagination.vue';
import { useFitPageSize } from '../shared/useViewport';
const route = useRoute();
let referenceOpened = false;
const tasks = ref<Activity[]>([]),
  stakeholders = ref<Stakeholder[]>([]),
  decisions = ref<Decision[]>([]),
  loading = ref(false),
  error = ref(''),
  message = ref('');
const search = ref(String(route.query.ref || '')),
  phase = ref(''),
  mobileLane = ref('pending'),
  editor = ref(false),
  editing = ref<Activity>(),
  viewing = ref<Activity>(),
  decisionForm = ref(false),
  selectedDecision = ref<Decision>();
const newDefaults = ref<Partial<Activity>>();
const title = ref(''),
  rationale = ref(''),
  activityId = ref(''),
  busy = ref(false),
  formError = ref('');
const pages = reactive<Record<string, number>>({ pending: 1, doing: 1, done: 1, decisions: 1 });
const { region: fitRegion, size: pageSize } = useFitPageSize(292, 128, 3);
const writable = computed(
  () => !!selectedEdition.value && canManage.value && selectedEdition.value.status !== 'archived',
);
const columns = [
  { key: 'pending', title: 'A fazer', caption: 'Preparar o próximo passo', number: '01' },
  { key: 'doing', title: 'Em execução', caption: 'Responsabilidades em movimento', number: '02' },
  { key: 'done', title: 'Concluídas', caption: 'Entregas que ficam registradas', number: '03' },
];
const filtered = computed(() =>
  tasks.value.filter(
    (a) =>
      (!phase.value || a.phase === phase.value) &&
      [a.id, a.title, a.description, a.owner_name]
        .join(' ')
        .toLowerCase()
        .includes(search.value.toLowerCase()),
  ),
);
const visibleDecisions = computed(() =>
  decisions.value.filter(
    (d) =>
      (!phase.value || tasks.value.find((a) => a.id === d.activity_id)?.phase === phase.value) &&
      [d.id, d.title, d.rationale, d.author_name, d.activity_id || '']
        .join(' ')
        .toLowerCase()
        .includes(search.value.toLowerCase()),
  ),
);
const laneItems = (key: string) => filtered.value.filter((a) => a.status === key);
const lanePage = (key: string) =>
  laneItems(key).slice((pages[key] - 1) * pageSize.value, pages[key] * pageSize.value);
const decisionPage = computed(() =>
  visibleDecisions.value.slice(
    (pages.decisions - 1) * pageSize.value,
    pages.decisions * pageSize.value,
  ),
);
function editable(a: Activity) {
  return (
    selectedEdition.value?.status !== 'archived' &&
    (canManage.value || a.owner_id === user.value?.id)
  );
}
async function load() {
  if (!selectedId.value) return;
  loading.value = true;
  error.value = '';
  try {
    [tasks.value, decisions.value, stakeholders.value] = await Promise.all([
      api('/editions/' + selectedId.value + '/activities'),
      api('/editions/' + selectedId.value + '/decisions'),
      api('/editions/' + selectedId.value + '/stakeholders'),
    ]);
    if (route.query.nova === '1' && !referenceOpened && writable.value) {
      const involved = stakeholders.value.find((s) => s.id === route.query.envolvido);
      if (involved)
        newDefaults.value = {
          title: 'Acompanhar: ' + involved.name,
          description: involved.responsibility,
          owner_id: involved.owner_id || user.value!.id,
          phase: involved.phase,
          stakeholder_id: involved.id,
        };
      editor.value = true;
      referenceOpened = true;
    }
    if (route.query.ref && !referenceOpened) {
      const activity = tasks.value.find((a) => a.id === route.query.ref);
      const decision = decisions.value.find((d) => d.id === route.query.ref);
      if (activity) {
        mobileLane.value = activity.status;
        viewing.value = activity;
      }
      if (decision) {
        mobileLane.value = 'decisions';
        selectedDecision.value = decision;
      }
      referenceOpened = true;
    }
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
      phase.value = '';
      referenceOpened = true;
    }
    editor.value = false;
    viewing.value = undefined;
    decisionForm.value = false;
    selectedDecision.value = undefined;
    load();
  },
  { immediate: true },
);
watch([search, phase], () => {
  Object.keys(pages).forEach((k) => (pages[k] = 1));
});
function edit(a?: Activity) {
  newDefaults.value = undefined;
  viewing.value = undefined;
  editing.value = a;
  editor.value = true;
  message.value = '';
}
async function saved() {
  editor.value = false;
  message.value = 'Atividade salva. Autoria e mudanças preservadas na trilha.';
  await load();
}
async function move(a: Activity, status: Activity['status']) {
  if (!editable(a) || a.status === status || busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    const result = await api<Activity>(
      '/activities/' + a.id,
      send(
        'PATCH',
        canManage.value
          ? { ...a, status, due_date: a.due_date.slice(0, 10) }
          : { status, version: a.version },
      ),
    );
    Object.assign(a, result);
    message.value = 'Movimentação registrada na trilha de auditoria.';
  } catch (e) {
    message.value = (e as Error).message;
    await load();
  } finally {
    busy.value = false;
  }
}
function drag(event: DragEvent, a: Activity) {
  if (!editable(a)) {
    event.preventDefault();
    return;
  }
  event.dataTransfer?.setData('text/plain', a.id);
}
function drop(event: DragEvent, status: string) {
  const a = tasks.value.find((a) => a.id === event.dataTransfer?.getData('text/plain'));
  if (a) move(a, status as Activity['status']);
}
async function saveDecision() {
  busy.value = true;
  formError.value = '';
  try {
    await api(
      '/editions/' + selectedId.value + '/decisions',
      send('POST', {
        title: title.value,
        rationale: rationale.value,
        activity_id: activityId.value || null,
      }),
    );
    decisionForm.value = false;
    title.value = '';
    mobileLane.value = 'decisions';
    rationale.value = '';
    activityId.value = '';
    message.value = 'Decisão registrada com contexto, autoria e data.';
    await load();
  } catch (e) {
    formError.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <section class="page-view board-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">Atividades da organização</p>
        <h1>Atividades e decisões<span class="heading-dot">.</span></h1>
        <p class="muted">Organize a execução. Preserve o motivo de cada escolha.</p>
      </div>
      <div class="heading-actions">
        <button v-if="writable" class="secondary" @click="decisionForm = true">
          <GitBranch :size="16" />Registrar decisão</button
        ><button v-if="writable" class="primary" @click="edit()">
          <Plus :size="17" />Nova atividade
        </button>
      </div>
    </header>
    <div class="board-toolbar">
      <label class="search"
        ><Search :size="16" /><input
          v-model="search"
          aria-label="Buscar atividades e decisões"
          placeholder="Buscar registro, responsável ou decisão" /></label
      ><label class="inline-label"
        >Etapa<select v-model="phase">
          <option value="">Todo o evento</option>
          <option value="before">Antes</option>
          <option value="during">Durante</option>
          <option value="after">Depois</option>
        </select></label
      ><RouterLink class="trail-link" to="/auditoria"
        ><GitBranch :size="16" />Cada movimento deixa um rastro<ArrowUpRight :size="14"
      /></RouterLink>
    </div>
    <div v-if="message" class="compact-message" role="status">{{ message }}</div>
    <div v-if="selectedEdition?.status === 'archived'" class="compact-message">
      <LockKeyhole :size="14" />Edição arquivada · leitura e continuidade.
    </div>
    <div class="mobile-lanes" role="group" aria-label="Coluna do quadro">
      <button
        v-for="c in [...columns, { key: 'decisions', title: 'Decisões' }]"
        :key="c.key"
        :class="{ active: mobileLane === c.key }"
        :aria-pressed="mobileLane === c.key"
        @click="mobileLane = c.key"
      >
        {{ c.title }}
      </button>
    </div>
    <PageState :loading="loading" :error="error" @retry="load">
      <div ref="fitRegion" class="kanban-grid page-region">
        <section
          v-for="column in columns"
          :key="column.key"
          class="kanban-lane"
          :class="[column.key, { 'mobile-active': mobileLane === column.key }]"
          :aria-label="column.title"
          @dragover.prevent
          @drop.prevent="drop($event, column.key)"
        >
          <header class="lane-header">
            <div>
              <span class="lane-number">{{ column.number }}</span>
              <h2>{{ column.title }}</h2>
              <span class="lane-count">{{ laneItems(column.key).length }}</span>
            </div>
            <p>{{ column.caption }}</p>
          </header>
          <div class="lane-cards">
            <article
              v-for="a in lanePage(column.key)"
              :key="a.id"
              class="kanban-card"
              :draggable="editable(a) && !busy"
              @dragstart="drag($event, a)"
            >
              <div class="card-topline">
                <span class="phase-tag">{{ labels[a.phase] }}</span><span
                  v-if="a.priority === 'high'"
                  class="priority-chip"
                  >Alta</span
                ><GripVertical v-if="editable(a)" :size="14" class="grip" />
              </div>
              <button class="card-title-button" @click="viewing = a">
                {{ a.title }}
              </button>
              <p class="clamp-two">{{ a.description }}</p>
              <div class="kanban-card-meta">
                <span class="mini-avatar">{{ a.owner_name.charAt(0) }}</span><span
                  class="truncate"
                  >{{ a.owner_name }}</span
                ><small><CalendarDays :size="11" />{{ formatDate(a.due_date) }}</small>
              </div>
              <div class="card-bottom">
                <span class="decision-count"
                  ><GitBranch :size="12" />{{
                    decisions.filter((d) => d.activity_id === a.id).length
                  }}
                  decisão(ões)</span
                ><select
                  v-if="editable(a)"
                  :value="a.status"
                  :disabled="busy"
                  :aria-label="'Mover atividade: ' + a.title"
                  @change="
                    move(a, ($event.target as HTMLSelectElement).value as Activity['status'])
                  "
                >
                  <option value="pending">A fazer</option>
                  <option value="doing">Em execução</option>
                  <option value="done">Concluída</option></select
                ><span v-else class="muted">Consulta</span>
              </div>
            </article>
            <p v-if="!laneItems(column.key).length" class="lane-empty">
              Nenhuma atividade nesta coluna.
            </p>
          </div>
          <Pagination
            v-model:page="pages[column.key]"
            :total="laneItems(column.key).length"
            :size="pageSize"
            :label="column.title"
          />
        </section>
        <section
          class="kanban-lane decision-lane"
          :class="{ 'mobile-active': mobileLane === 'decisions' }"
          aria-label="Decisões registradas"
        >
          <header class="lane-header">
            <div>
              <span class="lane-number"><GitBranch :size="16" /></span>
              <h2>Decisões</h2>
              <span class="lane-count">{{ visibleDecisions.length }}</span>
            </div>
            <p>O contexto acompanha a execução.</p>
          </header>
          <div class="lane-cards">
            <button
              v-for="d in decisionPage"
              :key="d.id"
              class="kanban-card decision-card"
              @click="selectedDecision = d"
            >
              <div class="card-topline">
                <span class="phase-tag">REGISTRO PERMANENTE</span><ArrowUpRight :size="14" />
              </div>
              <h3>{{ d.title }}</h3>
              <p class="clamp-two">{{ d.rationale }}</p>
              <span class="decision-related truncate">{{
                d.activity_title || 'Decisão geral da edição'
              }}</span>
              <div class="kanban-card-meta">
                <span class="mini-avatar">{{ d.author_name.charAt(0) }}</span><span
                  class="truncate"
                  >{{ d.author_name }}</span
                ><small>{{ formatDate(d.created_at) }}</small>
              </div>
            </button>
            <p v-if="!visibleDecisions.length" class="lane-empty">
              Nenhuma decisão para este filtro.
            </p>
          </div>
          <Pagination
            v-model:page="pages.decisions"
            :total="visibleDecisions.length"
            :size="pageSize"
            label="Decisões"
          />
        </section></div
    ></PageState>
    <div class="page-caption">
      <span>Antes · Durante · Depois</span
      ><span>Arraste um cartão ou use o seletor de situação. Decisões não mudam de coluna.</span>
    </div>
    <Modal v-if="viewing" title="Detalhes da atividade" @close="viewing = undefined">
      <span class="badge" :class="viewing.status">{{ labels[viewing.status] }}</span>
      <h2 class="activity-detail-title">{{ viewing.title }}</h2>
      <p class="detail-prose">{{ viewing.description || 'Descrição não informada.' }}</p>
      <dl class="detail-facts">
        <div>
          <dt>Responsável</dt>
          <dd>{{ viewing.owner_name }}</dd>
        </div>
        <div>
          <dt>Prazo e etapa</dt>
          <dd>{{ formatDate(viewing.due_date) }} · {{ labels[viewing.phase] }}</dd>
        </div>
        <div>
          <dt>Prioridade</dt>
          <dd>{{ labels[viewing.priority] }}</dd>
        </div>
        <div v-if="viewing.stakeholder_id">
          <dt>Participação relacionada</dt>
          <dd>
            <RouterLink
              class="text-link"
              :to="{ path: '/envolvidos', query: { ref: viewing.stakeholder_id } }"
              >{{
                stakeholders.find((s) => s.id === viewing?.stakeholder_id)?.name ||
                'Consultar envolvido'
              }}<ArrowUpRight :size="18"
            /></RouterLink>
          </dd>
        </div>
      </dl>
      <section
        v-if="decisions.some((d) => d.activity_id === viewing?.id)"
        class="related-decisions"
      >
        <h3>Decisões relacionadas</h3>
        <article v-for="d in decisions.filter((d) => d.activity_id === viewing?.id)" :key="d.id">
          <strong>{{ d.title }}</strong>
          <p>{{ d.rationale }}</p>
          <small>{{ d.author_name }}</small>
        </article>
      </section>
      <div class="heading-actions">
        <button v-if="editable(viewing)" class="primary" @click="edit(viewing)">
          Atualizar atividade</button
        ><RouterLink class="secondary" :to="{ path: '/auditoria', query: { ref: viewing.id } }"
          >Rastrear atividade<ArrowUpRight :size="14"
        /></RouterLink>
      </div>
    </Modal>
    <Modal v-if="editor" title="Atividade administrativa" @close="editor = false"
      ><ActivityEditor
        :key="(editing?.id || 'new') + selectedId"
        :edition-id="selectedId"
        :activity="editing"
        :defaults="newDefaults"
        @saved="saved"
        @cancel="editor = false"
    /></Modal>
    <Modal v-if="decisionForm" title="Registrar decisão" @close="decisionForm = false"
      ><p class="form-intro">
        Registre o que foi decidido e por quê. Correções serão novas decisões, preservando a
        anterior.
      </p>
      <form @submit.prevent="saveDecision">
        <fieldset :disabled="busy">
          <label
            >Decisão<input
              v-model="title"
              required
              minlength="3"
              maxlength="200"
              autofocus /></label
          ><label
            >Contexto e justificativa<textarea
              v-model="rationale"
              required
              minlength="10"
              maxlength="3000"
              rows="4"
            /></label
          ><label
            >Atividade relacionada<select v-model="activityId">
              <option value="">Decisão geral da edição</option>
              <option v-for="a in tasks" :key="a.id" :value="a.id">{{ a.title }}</option>
            </select></label
          >
          <p v-if="formError" class="error" role="alert">{{ formError }}</p>
          <button class="primary">
            {{ busy ? 'Registrando…' : 'Registrar e preservar decisão' }}
          </button>
        </fieldset>
      </form></Modal
    >
    <Modal v-if="selectedDecision" title="Memória da decisão" @close="selectedDecision = undefined"
      ><span class="section-kicker">REGISTRO PERMANENTE</span>
      <h2>{{ selectedDecision.title }}</h2>
      <p class="detail-prose">{{ selectedDecision.rationale }}</p>
      <dl class="detail-facts">
        <div>
          <dt>Registrado por</dt>
          <dd>{{ selectedDecision.author_name }}</dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>{{ formatDate(selectedDecision.created_at) }}</dd>
        </div>
        <div>
          <dt>Atividade</dt>
          <dd>{{ selectedDecision.activity_title || 'Contexto geral da edição' }}</dd>
        </div>
      </dl>
      <RouterLink class="primary" :to="{ path: '/auditoria', query: { ref: selectedDecision.id } }"
        >Rastrear esta decisão<ArrowUpRight :size="16" /></RouterLink
    ></Modal>
  </section>
</template>

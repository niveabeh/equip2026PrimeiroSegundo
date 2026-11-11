<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Plus, Search, ListChecks, MessageSquareText } from 'lucide-vue-next';
import { api, send } from '../shared/api';
import { selectedId, selectedEdition } from '../entities/edition';
import type { Activity, Decision } from '../entities/models';
import { labels, formatDate, isOverdue } from '../shared/format';
import { user, canManage } from '../features/auth/model';
import ActivityEditor from '../features/activities/ActivityEditor.vue';
import PageState from '../shared/PageState.vue';
const tasks = ref<Activity[]>([]),
  decisions = ref<Decision[]>([]),
  loading = ref(false),
  error = ref(''),
  message = ref(''),
  search = ref(''),
  status = ref(''),
  tab = ref('tasks'),
  editor = ref(false),
  editing = ref<Activity>(),
  decisionForm = ref(false),
  busy = ref(false),
  formError = ref('');
const title = ref(''),
  rationale = ref(''),
  activityId = ref('');
const writable = computed(() => canManage.value && selectedEdition.value?.status !== 'archived'),
  filtered = computed(() =>
    tasks.value.filter(
      (a) =>
        (!status.value || a.status === status.value) &&
        [a.title, a.description, a.owner_name]
          .join(' ')
          .toLocaleLowerCase()
          .includes(search.value.toLocaleLowerCase()),
    ),
  );
async function load() {
  if (!selectedId.value) return;
  loading.value = true;
  error.value = '';
  try {
    [tasks.value, decisions.value] = await Promise.all([
      api('/editions/' + selectedId.value + '/activities'),
      api('/editions/' + selectedId.value + '/decisions'),
    ]);
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
watch(
  selectedId,
  () => {
    editor.value = false;
    decisionForm.value = false;
    load();
  },
  { immediate: true },
);
function edit(a?: Activity) {
  editing.value = a;
  editor.value = true;
  decisionForm.value = false;
  message.value = '';
}
async function saved() {
  editor.value = false;
  message.value = 'Atividade salva. A alteração foi registrada na auditoria.';
  await load();
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
    rationale.value = '';
    activityId.value = '';
    message.value = 'Decisão registrada com autoria e justificativa.';
    await load();
  } catch (e) {
    formError.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">ORGANIZAÇÃO EM MOVIMENTO</p>
      <h1>Atividades e decisões</h1>
      <p class="muted">Responsáveis claros. Escolhas com memória.</p>
    </div>
    <button
      v-if="writable"
      class="primary"
      @click="tab === 'tasks' ? edit() : (decisionForm = true)"
    >
      <Plus :size="18" />{{ tab === 'tasks' ? 'Nova atividade' : 'Registrar decisão' }}
    </button>
  </div>
  <p v-if="selectedEdition?.status === 'archived'" class="notice">
    Edição arquivada. Os registros estão preservados para consulta.
  </p>
  <p v-if="message" role="status" class="success">{{ message }}</p>
  <div class="tabs" role="group" aria-label="Tipo de registro">
    <button
      :aria-pressed="tab === 'tasks'"
      :class="{ active: tab === 'tasks' }"
      @click="tab = 'tasks'"
    >
      <ListChecks :size="18" />Atividades <span>{{ tasks.length }}</span></button
    ><button
      :aria-pressed="tab === 'decisions'"
      :class="{ active: tab === 'decisions' }"
      @click="tab = 'decisions'"
    >
      <MessageSquareText :size="18" />Decisões <span>{{ decisions.length }}</span>
    </button>
  </div>
  <ActivityEditor
    v-if="editor"
    :key="(editing?.id || 'new') + selectedId"
    :edition-id="selectedId"
    :activity="editing"
    @saved="saved"
    @cancel="editor = false"
  />
  <section v-if="decisionForm" class="editor">
    <div class="section-head">
      <h2>Registrar decisão</h2>
      <button class="secondary" @click="decisionForm = false">Fechar</button>
    </div>
    <p class="muted">
      Registros são permanentes. Para corrigir uma decisão, registre uma nova indicando a anterior.
    </p>
    <form @submit.prevent="saveDecision">
      <fieldset :disabled="busy">
        <label>Decisão<input v-model="title" required minlength="3" maxlength="200" /></label
        ><label
          >Contexto e justificativa<textarea
            v-model="rationale"
            required
            minlength="10"
            maxlength="3000"
            rows="4"
          /></label
        ><label
          >Atividade relacionada (opcional)<select v-model="activityId">
            <option value="">Decisão geral da edição</option>
            <option v-for="a in tasks" :key="a.id" :value="a.id">{{ a.title }}</option>
          </select></label
        >
        <p v-if="formError" class="error" role="alert">{{ formError }}</p>
        <button class="primary">{{ busy ? 'Registrando…' : 'Registrar decisão' }}</button>
      </fieldset>
    </form>
  </section>
  <PageState :loading="loading" :error="error" @retry="load"
    ><section v-if="tab === 'tasks'" class="card">
      <div class="filters">
        <label class="search"
          ><Search :size="18" /><input
            v-model="search"
            aria-label="Buscar atividades"
            placeholder="Buscar atividade ou responsável…" /></label
        ><label class="filter-label"
          >Situação<select v-model="status">
            <option value="">Todas as situações</option>
            <option value="pending">Pendente</option>
            <option value="doing">Em andamento</option>
            <option value="done">Concluída</option>
          </select></label
        >
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Atividade</th>
              <th scope="col">Responsável</th>
              <th scope="col">Prazo</th>
              <th scope="col">Situação</th>
              <th scope="col">Ação</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in filtered" :key="a.id">
              <td>
                <strong>{{ a.title }}</strong
                ><small>{{ a.description }}</small
                ><span v-if="a.priority === 'high'" class="priority">Prioridade alta</span>
              </td>
              <td>{{ a.owner_name }}</td>
              <td :class="{ late: isOverdue(a.due_date, a.status) }">
                {{ formatDate(a.due_date)
                }}<small v-if="isOverdue(a.due_date, a.status)">Prazo vencido</small>
              </td>
              <td>
                <span class="badge" :class="a.status">{{ labels[a.status] }}</span>
              </td>
              <td>
                <button
                  v-if="
                    selectedEdition?.status !== 'archived' && (canManage || a.owner_id === user?.id)
                  "
                  class="secondary"
                  :aria-label="'Atualizar ' + a.title"
                  @click="edit(a)"
                >
                  Atualizar</button
                ><span v-else class="muted">Consulta</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!filtered.length" class="empty">
        Nenhuma atividade encontrada. Ajuste os filtros ou crie a primeira atividade.
      </p>
      <p class="table-foot">
        {{ filtered.length }} atividade(s) · Mudanças preservadas na auditoria
      </p>
    </section>
    <section v-else class="decisions-list">
      <article v-for="d in decisions" :key="d.id" class="card">
        <div class="section-head">
          <span class="section-kicker">DECISÃO REGISTRADA</span
          ><small>{{ formatDate(d.created_at) }}</small>
        </div>
        <h2>{{ d.title }}</h2>
        <p class="decision-text">{{ d.rationale }}</p>
        <p v-if="d.activity_title" class="muted">Atividade: {{ d.activity_title }}</p>
        <div class="decision-author">
          <span class="avatar small">{{ d.author_name.charAt(0) }}</span
          >{{ d.author_name }}<span class="muted">· Registro permanente</span>
        </div>
      </article>
      <p v-if="!decisions.length" class="empty card">Nenhuma decisão registrada nesta edição.</p>
    </section></PageState
  >
</template>

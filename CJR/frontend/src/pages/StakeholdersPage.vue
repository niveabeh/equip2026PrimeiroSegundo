<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Plus,
  Search,
  Package,
  HeartHandshake,
  Users,
  Network,
  BriefcaseBusiness,
  UserRound,
  ArrowRight,
  History,
  ClipboardPlus,
  Pencil,
} from 'lucide-vue-next';
import { selectedId, selectedEdition } from '../entities/edition';
import { canManage, user } from '../features/auth/model';
import { api, send } from '../shared/api';
import type { Stakeholder, User } from '../entities/models';
import { stakeholderGroups } from '../entities/stakeholder';
import { labels } from '../shared/format';
import PageState from '../shared/PageState.vue';
import Modal from '../shared/Modal.vue';
import Pagination from '../shared/Pagination.vue';
import { useFitPageSize } from '../shared/useViewport';
const route = useRoute(),
  router = useRouter();
const icons = [Package, HeartHandshake, Users, Network, BriefcaseBusiness, UserRound];
const initial =
  stakeholderGroups.find((g) => g.key === route.query.categoria)?.key || 'fornecedores';
const activeKey = ref<string>(initial),
  items = ref<Stakeholder[]>([]),
  members = ref<User[]>([]),
  loading = ref(false),
  error = ref(''),
  formError = ref(''),
  message = ref(''),
  search = ref(''),
  page = ref(1),
  detail = ref<Stakeholder>(),
  editing = ref(false),
  current = ref<Stakeholder>(),
  busy = ref(false);
const form = reactive({
  name: '',
  category: 'Fornecedor',
  responsibility: '',
  contact: '',
  owner_id: '',
  phase: 'before',
  operational_status: 'scheduled',
  notes: '',
});
const { region: fitRegion, size } = useFitPageSize(224, 52, 5);
const activeGroup = computed(
  () => stakeholderGroups.find((g) => g.key === activeKey.value) || stakeholderGroups[0],
);
const writable = computed(
  () => canManage.value && !!selectedEdition.value && selectedEdition.value.status !== 'archived',
);
const filtered = computed(() =>
  items.value.filter(
    (i) =>
      i.category === activeGroup.value.value &&
      [i.name, i.responsibility, i.owner_name || '', i.contact]
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(search.value.toLocaleLowerCase('pt-BR')),
  ),
);
const rows = computed(() =>
  filtered.value.slice((page.value - 1) * size.value, page.value * size.value),
);
let loadSequence = 0,
  referenceOpened = false;
async function load() {
  if (!selectedId.value) return;
  const sequence = ++loadSequence,
    editionId = selectedId.value;
  loading.value = true;
  error.value = '';
  try {
    const [records, people] = await Promise.all([
      api<Stakeholder[]>('/editions/' + editionId + '/stakeholders'),
      api<User[]>('/editions/' + editionId + '/members'),
    ]);
    if (sequence !== loadSequence) return;
    items.value = records;
    members.value = people;
    if (route.query.ref && !referenceOpened) {
      const s = records.find((s) => s.id === route.query.ref);
      if (s) {
        activeKey.value = stakeholderGroups.find((g) => g.value === s.category)?.key || 'outros';
        detail.value = s;
      }
      referenceOpened = true;
    }
  } catch (e) {
    if (sequence === loadSequence) error.value = (e as Error).message;
  } finally {
    if (sequence === loadSequence) loading.value = false;
  }
}
watch(
  selectedId,
  (next, previous) => {
    editing.value = false;
    detail.value = undefined;
    page.value = 1;
    if (previous && next !== previous) {
      search.value = '';
      referenceOpened = true;
    }
    load();
  },
  { immediate: true },
);
watch([search, activeKey], () => (page.value = 1));
watch(
  () => route.query.categoria,
  (key) => {
    if (stakeholderGroups.some((g) => g.key === key)) activeKey.value = String(key);
  },
);
function choose(key: string) {
  activeKey.value = key;
  search.value = '';
  detail.value = undefined;
  router.replace({ query: { ...route.query, categoria: key, ref: undefined } });
}
async function keyTab(event: KeyboardEvent, index: number) {
  const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
  if (!keys.includes(event.key)) return;
  event.preventDefault();
  const target =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? 5
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + 6) % 6;
  choose(stakeholderGroups[target].key);
  await nextTick();
  document.getElementById('group-' + stakeholderGroups[target].key)?.focus();
}
function edit(s?: Stakeholder) {
  current.value = s;
  Object.assign(form, {
    name: s?.name || '',
    category: s?.category || activeGroup.value.value,
    responsibility: s?.responsibility || '',
    contact: s?.contact || '',
    owner_id: s?.owner_id || user.value?.id || '',
    phase: s?.phase || 'before',
    operational_status: s?.operational_status || 'scheduled',
    notes: s?.notes || '',
  });
  formError.value = '';
  editing.value = true;
  detail.value = undefined;
}
async function save() {
  busy.value = true;
  formError.value = '';
  try {
    await api(
      current.value
        ? '/stakeholders/' + current.value.id
        : '/editions/' + selectedId.value + '/stakeholders',
      send(current.value ? 'PATCH' : 'POST', {
        ...form,
        owner_id: form.owner_id || null,
        ...(current.value ? { version: current.value.version } : {}),
      }),
    );
    activeKey.value = stakeholderGroups.find((g) => g.value === form.category)?.key || 'outros';
    editing.value = false;
    message.value = current.value
      ? 'Responsabilidade atualizada. A versão anterior está preservada na auditoria.'
      : 'Cadastro salvo com a responsabilidade nesta edição.';
    await load();
  } catch (e) {
    formError.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <section class="page-view stakeholders-page readable-directory">
    <header class="page-heading">
      <div>
        <p class="eyebrow">Organização do evento</p>
        <h1>Envolvidos na operação</h1>
        <p class="muted">
          Consulte quem participa, o que faz e quem acompanha cada responsabilidade.
        </p>
      </div>
      <RouterLink class="secondary" to="/patrocinadores"
        >Ver patrocinadores<ArrowRight :size="18"
      /></RouterLink>
    </header>
    <div class="participant-tab-select">
      <label
        >Escolha o grupo<select
          :value="activeKey"
          @change="choose(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="g in stakeholderGroups" :key="g.key" :value="g.key">
            {{ g.label }} ({{ items.filter((i) => i.category === g.value).length }})
          </option>
        </select></label
      >
    </div>
    <div class="participant-tabs" role="tablist" aria-label="Grupos de envolvidos">
      <button
        v-for="(g, index) in stakeholderGroups"
        :id="'group-' + g.key"
        :key="g.key"
        role="tab"
        :aria-selected="activeKey === g.key"
        aria-controls="envolvidos-panel"
        :tabindex="activeKey === g.key ? 0 : -1"
        :class="[g.tone, { active: activeKey === g.key }]"
        @click="choose(g.key)"
        @keydown="keyTab($event, index)"
      >
        <span class="group-symbol"
          ><component :is="icons[index]" :size="22" aria-hidden="true" /></span
        ><span>{{ g.label }}</span
        ><span class="group-count">{{ items.filter((i) => i.category === g.value).length }}</span>
      </button>
    </div>
    <div class="group-context" :class="activeGroup.tone">
      <div>
        <h2>{{ activeGroup.label }}</h2>
        <p>{{ activeGroup.purpose }}</p>
      </div>
      <button v-if="writable" class="primary" @click="edit()">
        <Plus :size="19" />Adicionar {{ activeGroup.singular }}</button
      ><span v-else class="read-only-label">{{
        selectedEdition?.status === 'archived'
          ? 'Edição arquivada · somente consulta'
          : 'Acesso de consulta'
      }}</span>
    </div>
    <div class="board-toolbar">
      <label class="search"
        ><Search :size="20" /><input
          v-model="search"
          :aria-label="'Buscar em ' + activeGroup.label"
          placeholder="Buscar por nome, responsabilidade ou pessoa de referência" /></label
      ><button v-if="search" class="text-link" @click="search = ''">Limpar busca</button
      ><span class="results-label" role="status"
        >{{ filtered.length }} {{ filtered.length === 1 ? 'cadastro' : 'cadastros' }} nesta
        aba</span
      >
    </div>
    <p v-if="message" class="compact-message" role="status">
      {{ message
      }}<button class="text-link" @click="message = ''" aria-label="Dispensar mensagem">
        Fechar
      </button>
    </p>
    <PageState :loading="loading" :error="error" @retry="load"
      ><section
        id="envolvidos-panel"
        ref="fitRegion"
        class="directory-panel page-region operational-panel"
        role="tabpanel"
        :aria-labelledby="'group-' + activeKey"
        tabindex="0"
      >
        <ul class="operational-list">
          <li v-for="s in rows" :key="s.id">
            <article class="operational-record" :class="activeGroup.tone">
              <div class="operational-record-heading">
                <h3>{{ s.name }}</h3>
                <span class="badge" :class="s.operational_status">{{
                  labels[s.operational_status]
                }}</span>
              </div>
              <p class="record-responsibility clamp-two">{{ s.responsibility }}</p>
              <div class="operational-record-footer">
                <span
                  ><UserRound :size="17" /><span
                    ><strong>Acompanhamento:</strong>
                    {{ s.owner_name || 'Ainda não definido' }}</span
                  ></span
                ><span class="phase-readable">{{ labels[s.phase] }}</span
                ><button
                  class="secondary"
                  :aria-label="'Ver detalhes de ' + s.name"
                  @click="detail = s"
                >
                  Ver detalhes<ArrowRight :size="17" />
                </button>
              </div>
            </article>
          </li>
        </ul>
        <div v-if="!rows.length" class="empty">
          <h3>{{ search ? 'Nenhum resultado nesta aba.' : 'Nenhum cadastro neste grupo.' }}</h3>
          <p>
            {{
              search
                ? 'Tente outro nome ou limpe a busca.'
                : 'Adicione uma participação com sua responsabilidade na edição.'
            }}
          </p>
          <button v-if="search" class="secondary" @click="search = ''">Limpar busca</button
          ><button v-else-if="writable" class="primary" @click="edit()">
            Adicionar {{ activeGroup.singular }}
          </button>
        </div>
        <Pagination
          v-model:page="page"
          :total="filtered.length"
          :size="size"
          :label="activeGroup.label"
        /></section
    ></PageState>
    <div class="page-caption">
      <span>O cadastro descreve a participação nesta edição; não cria uma conta de acesso.</span>
    </div>
    <Modal
      v-if="editing"
      :title="current ? 'Atualizar responsabilidade' : 'Adicionar ' + activeGroup.singular"
      @close="editing = false"
      ><p class="form-intro">
        Registre a participação operacional na edição. As alterações ficam identificadas na trilha
        de auditoria.
      </p>
      <form @submit.prevent="save">
        <fieldset :disabled="busy">
          <label
            >Nome da pessoa ou organização<input
              v-model="form.name"
              required
              minlength="3"
              maxlength="200"
              autofocus /></label
          ><label
            >Grupo<select v-model="form.category">
              <option v-for="g in stakeholderGroups" :key="g.key" :value="g.value">
                {{ g.label }}
              </option>
            </select></label
          ><label
            >O que esta participação deve fazer?<textarea
              v-model="form.responsibility"
              required
              minlength="3"
              maxlength="1000"
              rows="3"
              placeholder="Descreva a entrega, função ou apoio combinado."
            /></label
          ><label
            >Quem acompanha esta responsabilidade?<select v-model="form.owner_id" required>
              <option value="" disabled>Escolha uma pessoa da equipe</option>
              <option v-for="m in members" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select></label
          >
          <div class="form-grid two">
            <label
              >Quando participa?<select v-model="form.phase">
                <option value="before">Antes do evento</option>
                <option value="during">Durante o evento</option>
                <option value="after">Depois do evento</option>
              </select></label
            ><label
              >Como está o acompanhamento?<select v-model="form.operational_status">
                <option value="scheduled">A combinar</option>
                <option value="confirmed">Confirmado</option>
                <option value="in_progress">Em acompanhamento</option>
                <option value="finished">Concluído</option>
              </select></label
            >
          </div>
          <label
            >Contato<input
              v-model="form.contact"
              maxlength="200"
              placeholder="Use um contato fictício nesta demonstração." /></label
          ><label
            >Orientações para a equipe e a próxima edição<textarea
              v-model="form.notes"
              maxlength="2000"
              rows="3"
            />
          </label>
          <p v-if="formError" class="error" role="alert">{{ formError }}</p>
          <div class="heading-actions">
            <button class="secondary" type="button" @click="editing = false">Cancelar</button
            ><button class="primary" type="submit">
              {{ busy ? 'Salvando…' : 'Salvar responsabilidade' }}
            </button>
          </div>
        </fieldset>
      </form></Modal
    >
    <Modal v-if="detail" title="Responsabilidade na edição" @close="detail = undefined"
      ><div class="detail-title">
        <div>
          <span class="section-kicker">{{ detail.category }}</span>
          <h2>{{ detail.name }}</h2>
        </div>
      </div>
      <span class="badge" :class="detail.operational_status">{{
        labels[detail.operational_status]
      }}</span>
      <dl class="detail-facts">
        <div>
          <dt>Responsabilidade</dt>
          <dd>{{ detail.responsibility }}</dd>
        </div>
        <div>
          <dt>Pessoa da equipe que acompanha</dt>
          <dd>{{ detail.owner_name || 'Ainda não definida' }}</dd>
        </div>
        <div>
          <dt>Etapa</dt>
          <dd>{{ labels[detail.phase] }}</dd>
        </div>
        <div>
          <dt>Contato</dt>
          <dd>{{ detail.contact || 'Não informado' }}</dd>
        </div>
        <div>
          <dt>Orientações e continuidade</dt>
          <dd>{{ detail.notes || 'Nenhuma orientação registrada.' }}</dd>
        </div>
        <div>
          <dt>Edição de origem</dt>
          <dd>{{ selectedEdition?.name }}</dd>
        </div>
      </dl>
      <div class="detail-action-stack">
        <button v-if="writable" class="primary" @click="edit(detail)">
          <Pencil :size="18" />Atualizar responsabilidade</button
        ><RouterLink
          v-if="writable"
          class="secondary"
          :to="{ path: '/atividades', query: { nova: '1', envolvido: detail.id } }"
          ><ClipboardPlus :size="18" />Criar atividade para este envolvido</RouterLink
        ><RouterLink class="secondary" :to="{ path: '/auditoria', query: { ref: detail.id } }"
          ><History :size="18" />Consultar histórico de alterações</RouterLink
        >
      </div></Modal
    >
  </section>
</template>

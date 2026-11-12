<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Plus, Handshake, Search, ArrowUpRight, PackageCheck, UserRound } from 'lucide-vue-next';
import { api, send } from '../shared/api';
import { selectedId, selectedEdition } from '../entities/edition';
import { canManage, user } from '../features/auth/model';
import type { Sponsor, User } from '../entities/models';
import { labels } from '../shared/format';
import Modal from '../shared/Modal.vue';
import Pagination from '../shared/Pagination.vue';
import PageState from '../shared/PageState.vue';
import { useFitPageSize } from '../shared/useViewport';
const route = useRoute();
const items = ref<Sponsor[]>([]),
  members = ref<User[]>([]),
  loading = ref(false),
  error = ref(''),
  search = ref(String(route.query.ref || '')),
  stage = ref(''),
  page = ref(1),
  editing = ref(false),
  current = ref<Sponsor>(),
  detail = ref<Sponsor>(),
  busy = ref(false),
  formError = ref(''),
  message = ref('');
const { region: fitRegion, size } = useFitPageSize(204, 104, 6);
const writable = computed(
  () => canManage.value && !!selectedEdition.value && selectedEdition.value.status !== 'archived',
);
const form = reactive({
  name: '',
  contribution: '',
  counterpart: '',
  contact: '',
  owner_id: '',
  status: 'prospect' as Sponsor['status'],
  notes: '',
});
const filtered = computed(() =>
    items.value.filter(
      (s) =>
        (!stage.value || s.status === stage.value) &&
        [s.id, s.name, s.contribution, s.owner_name]
          .join(' ')
          .toLowerCase()
          .includes(search.value.toLowerCase()),
    ),
  ),
  rows = computed(() =>
    filtered.value.slice((page.value - 1) * size.value, page.value * size.value),
  );
const statuses = ['prospect', 'contacted', 'confirmed', 'delivered'];
async function load() {
  if (!selectedId.value) return;
  loading.value = true;
  error.value = '';
  try {
    [items.value, members.value] = await Promise.all([
      api('/editions/' + selectedId.value + '/sponsors'),
      api('/editions/' + selectedId.value + '/members'),
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
    editing.value = false;
    detail.value = undefined;
    page.value = 1;
    load();
  },
  { immediate: true },
);
watch([search, stage], () => (page.value = 1));
function edit(s?: Sponsor) {
  current.value = s;
  Object.assign(form, {
    name: s?.name || '',
    contribution: s?.contribution || '',
    counterpart: s?.counterpart || '',
    contact: s?.contact || '',
    owner_id: s?.owner_id || user.value!.id,
    status: s?.status || 'prospect',
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
        ? '/sponsors/' + current.value.id
        : '/editions/' + selectedId.value + '/sponsors',
      send(current.value ? 'PATCH' : 'POST', {
        ...form,
        ...(current.value ? { version: current.value.version } : {}),
      }),
    );
    editing.value = false;
    message.value =
      'Relação de patrocínio salva. O apoio e suas alterações estão na trilha de auditoria.';
    await load();
  } catch (e) {
    formError.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <section class="page-view sponsors-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">Apoios à organização</p>
        <h1>Patrocinadores<span class="heading-dot">.</span></h1>
        <p class="muted">
          Do primeiro contato ao apoio recebido: cada compromisso tem um responsável.
        </p>
      </div>
      <button v-if="writable" class="primary" @click="edit()">
        <Plus :size="17" />Novo patrocinador
      </button>
    </header>
    <div class="sponsor-summary">
      <button
        v-for="s in statuses"
        :key="s"
        :class="{ active: stage === s }"
        @click="stage = stage === s ? '' : s"
        :aria-pressed="stage === s"
      >
        <span class="status-dot" :class="s" /><span>{{ labels[s] }}</span
        ><strong>{{ items.filter((i) => i.status === s).length }}</strong>
      </button>
    </div>
    <div class="board-toolbar">
      <label class="search"
        ><Search :size="16" /><input
          v-model="search"
          placeholder="Buscar patrocinador, apoio ou responsável"
          aria-label="Buscar patrocinadores" /></label
      ><span class="toolbar-note">Relações fictícias · sem contratos ou pagamentos</span
      ><RouterLink to="/auditoria" class="trail-link"
        >Rastrear os apoios<ArrowUpRight :size="14"
      /></RouterLink>
    </div>
    <p v-if="message" class="compact-message" role="status">{{ message }}</p>
    <PageState :loading="loading" :error="error" @retry="load"
      ><section ref="fitRegion" class="directory-panel page-region">
        <header class="panel-heading">
          <h2><Handshake :size="17" />Rede de patrocínio</h2>
          <span>{{ filtered.length }} relações nesta edição</span>
        </header>
        <div class="sponsor-rows">
          <article class="sponsor-row" v-for="s in rows" :key="s.id">
            <span class="organization-avatar">{{
              s.name
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
            }}</span>
            <div class="sponsor-identity">
              <h2>{{ s.name }}</h2>
              <p class="clamp-two">{{ s.contribution }}</p>
            </div>
            <div class="sponsor-owner">
              <small>Relacionamento</small
              ><strong><UserRound :size="12" />{{ s.owner_name }}</strong>
            </div>
            <span class="badge" :class="s.status">{{ labels[s.status] }}</span><button
              class="secondary"
              @click="detail = s"
            >
              Ver relação<ArrowUpRight :size="13" />
            </button>
          </article>
          <p v-if="!filtered.length" class="empty">Nenhum patrocinador corresponde aos filtros.</p>
        </div>
        <Pagination
          v-model:page="page"
          :total="filtered.length"
          :size="size"
          label="Patrocinadores"
        /></section
    ></PageState>
    <div class="page-caption">
      <span>Apoio combinado · Responsável · Condições · Andamento</span
      ><span>Sem publicação automática de marcas ou informações.</span>
    </div>
    <Modal
      v-if="editing"
      :title="current ? 'Atualizar relação de patrocínio' : 'Novo patrocinador fictício'"
      @close="editing = false"
      ><form @submit.prevent="save">
        <fieldset :disabled="busy">
          <label
            >Nome da organização<input
              v-model="form.name"
              required
              minlength="3"
              maxlength="200"
              autofocus /></label
          ><label
            >Apoio combinado<textarea
              v-model="form.contribution"
              required
              minlength="3"
              maxlength="2000"
              rows="3"
            />
          </label>
          <div class="form-grid two">
            <label
              >Responsável pelo relacionamento<select v-model="form.owner_id" required>
                <option v-for="m in members" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select></label
            ><label
              >Andamento<select v-model="form.status">
                <option v-for="s in statuses" :key="s" :value="s">{{ labels[s] }}</option>
              </select></label
            >
          </div>
          <label
            >Contato fictício<input
              v-model="form.contact"
              maxlength="200"
              placeholder="apoio@example.test" /></label
          ><label
            >Condições de reconhecimento<textarea
              v-model="form.counterpart"
              maxlength="2000"
              rows="2"
              placeholder="O que foi alinhado e o que ainda depende de validação"
            ></textarea></label
          ><label
            >Observações e continuidade<textarea v-model="form.notes" maxlength="3000" rows="2" />
          </label>
          <p v-if="formError" class="error" role="alert">{{ formError }}</p>
          <button class="primary">{{ busy ? 'Salvando…' : 'Salvar e registrar na trilha' }}</button>
        </fieldset>
      </form></Modal
    >
    <Modal v-if="detail" title="Relação de patrocínio" @close="detail = undefined"
      ><div class="detail-title">
        <span class="organization-avatar"><Handshake /></span>
        <div>
          <h2>{{ detail.name }}</h2>
          <span class="badge" :class="detail.status">{{ labels[detail.status] }}</span>
        </div>
      </div>
      <dl class="detail-facts">
        <div>
          <dt>Apoio combinado</dt>
          <dd>{{ detail.contribution }}</dd>
        </div>
        <div>
          <dt>Responsável pelo relacionamento</dt>
          <dd>{{ detail.owner_name }}</dd>
        </div>
        <div>
          <dt>Contato fictício</dt>
          <dd>{{ detail.contact || 'Não informado' }}</dd>
        </div>
        <div>
          <dt>Condições de reconhecimento</dt>
          <dd>{{ detail.counterpart || 'Ainda não informadas' }}</dd>
        </div>
        <div>
          <dt>Observações</dt>
          <dd>{{ detail.notes || 'Sem observações' }}</dd>
        </div>
      </dl>
      <div class="heading-actions">
        <button v-if="writable" class="primary" @click="edit(detail)">Atualizar relação</button
        ><RouterLink class="secondary" :to="{ path: '/auditoria', query: { ref: detail.id } }"
          >Ver rastreabilidade<ArrowUpRight :size="14"
        /></RouterLink></div
    ></Modal>
  </section>
</template>

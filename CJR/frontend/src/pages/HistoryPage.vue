<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  Archive,
  ArrowUpRight,
  Plus,
  CalendarDays,
  MapPin,
  History,
  Search,
} from 'lucide-vue-next';
import { editions, loadEditions, selectEdition } from '../entities/edition';
import { isAdmin } from '../features/auth/model';
import { api, send } from '../shared/api';
import { labels, formatDate } from '../shared/format';
import Modal from '../shared/Modal.vue';
import Pagination from '../shared/Pagination.vue';
import { useViewport, useFitPageSize } from '../shared/useViewport';
import type { Edition } from '../entities/models';
const detailEdition = ref<Edition>();
const router = useRouter(),
  creating = ref(false),
  error = ref(''),
  busy = ref(false),
  page = ref(1),
  search = ref('');
const name = ref(''),
  year = ref(2028),
  date = ref(''),
  location = ref(''),
  summary = ref('');
const { region: fitRegion, size: fitRows } = useFitPageSize(310, 0, 2);
const { width } = useViewport(),
  size = computed(() => (width.value < 720 ? 1 : fitRows.value * 2)),
  filtered = computed(() =>
    editions.value.filter((e) =>
      [e.name, e.year, e.summary].join(' ').toLowerCase().includes(search.value.toLowerCase()),
    ),
  ),
  rows = computed(() =>
    filtered.value.slice((page.value - 1) * size.value, page.value * size.value),
  );
function open(id: string) {
  selectEdition(id);
  router.push('/');
}
async function create() {
  busy.value = true;
  error.value = '';
  try {
    const e = await api(
      '/editions',
      send('POST', {
        name: name.value,
        year: year.value,
        event_date: date.value,
        location: location.value,
        summary: summary.value,
      }),
    );
    await loadEditions();
    creating.value = false;
    open(e.id);
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function archive(id: string) {
  if (
    !window.confirm(
      'Arquivar esta edição? Ela ficará permanentemente disponível apenas para consulta.',
    )
  )
    return;
  try {
    await api('/editions/' + id, send('PATCH', { status: 'archived' }));
    await loadEditions();
  } catch (e) {
    error.value = (e as Error).message;
  }
}
</script>
<template>
  <section class="page-view history-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">Consulta de edições</p>
        <h1>Histórico de edições<span class="heading-dot">.</span></h1>
        <p class="muted">Cada edição entrega conhecimento à próxima equipe.</p>
      </div>
      <button v-if="isAdmin" class="primary" @click="creating = true">
        <Plus :size="17" />Nova edição
      </button>
    </header>
    <div class="history-intro">
      <span class="history-symbol"><History :size="25" /></span>
      <div>
        <h2>Recupere o contexto. Continue com clareza.</h2>
        <p>
          Atividades, pessoas, patrocinadores e decisões permanecem vinculados à edição de origem.
        </p>
      </div>
      <span class="intro-count"
        ><strong>{{ editions.length }}</strong> edições na memória</span
      >
    </div>
    <div class="board-toolbar">
      <label class="search"
        ><Search :size="16" /><input
          v-model="search"
          @input="page = 1"
          aria-label="Buscar edições"
          placeholder="Buscar ano, edição ou aprendizado" /></label
      ><span class="toolbar-note">Edições arquivadas são somente leitura.</span>
    </div>
    <p v-if="error" class="compact-message error" role="alert">{{ error }}</p>
    <div ref="fitRegion" class="edition-cards page-region" :class="{ 'single-row': size <= 2 }">
      <article v-for="e in rows" :key="e.id" class="edition-record">
        <header>
          <span class="year">{{ e.year }}</span><span class="badge" :class="e.status">{{
            labels[e.status]
          }}</span>
        </header>
        <button class="edition-title-button" @click="detailEdition = e">
          <h2>{{ e.name }}</h2>
        </button>
        <div class="edition-record-meta">
          <span><CalendarDays :size="12" />{{ formatDate(e.event_date) }}</span
          ><span class="truncate"><MapPin :size="12" />{{ e.location }}</span>
        </div>
        <p class="clamp-three">{{ e.summary || 'Resumo ainda não informado.' }}</p>
        <footer>
          <button class="text-link" @click="open(e.id)">
            Abrir memória da edição<ArrowUpRight :size="14" /></button
          ><button
            v-if="isAdmin && e.status !== 'archived'"
            class="archive-button"
            :aria-label="'Arquivar ' + e.name"
            @click="archive(e.id)"
          >
            <Archive :size="14" />Arquivar
          </button>
        </footer>
      </article>
      <div v-if="!rows.length" class="empty surface-panel">Nenhuma edição encontrada.</div>
    </div>
    <Pagination v-model:page="page" :total="filtered.length" :size="size" label="Edições" />
    <Modal
      v-if="detailEdition"
      title="Contexto e aprendizados da edição"
      @close="detailEdition = undefined"
      ><span class="badge" :class="detailEdition.status">{{ labels[detailEdition.status] }}</span>
      <h2 class="activity-detail-title">{{ detailEdition.name }}</h2>
      <p class="detail-prose">{{ detailEdition.summary || 'Resumo ainda não informado.' }}</p>
      <dl class="detail-facts">
        <div>
          <dt>Data</dt>
          <dd>{{ formatDate(detailEdition.event_date) }}</dd>
        </div>
        <div>
          <dt>Local</dt>
          <dd>{{ detailEdition.location }}</dd>
        </div>
      </dl>
      <button class="primary" @click="open(detailEdition.id)">
        Consultar registros desta edição<ArrowUpRight :size="15" /></button
    ></Modal>
    <Modal v-if="creating" title="Criar edição" @close="creating = false"
      ><form @submit.prevent="create">
        <fieldset :disabled="busy">
          <label
            >Nome da edição<input v-model="name" required minlength="3" maxlength="200" autofocus
          /></label>
          <div class="form-grid two">
            <label
              >Ano<input
                v-model.number="year"
                type="number"
                min="2020"
                max="2100"
                required /></label
            ><label>Data prevista<input v-model="date" type="date" required /></label>
          </div>
          <label>Local<input v-model="location" required minlength="3" maxlength="200" /></label
          ><label
            >Contexto e aprendizados iniciais<textarea
              v-model="summary"
              maxlength="2000"
              rows="3"
            />
          </label>
          <p v-if="error" class="error" role="alert">{{ error }}</p>
          <button class="primary">{{ busy ? 'Criando…' : 'Criar edição' }}</button>
        </fieldset>
      </form></Modal
    >
  </section>
</template>

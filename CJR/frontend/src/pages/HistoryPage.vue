<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Archive, ArrowRight, Plus } from 'lucide-vue-next';
import { editions, loadEditions, selectEdition } from '../entities/edition';
import { isAdmin } from '../features/auth/model';
import { api, send } from '../shared/api';
import { labels, formatDate } from '../shared/format';
const router = useRouter(),
  creating = ref(false),
  error = ref(''),
  busy = ref(false);
const name = ref(''),
  year = ref(2028),
  date = ref(''),
  location = ref(''),
  summary = ref('');
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
  <div class="page-heading">
    <div>
      <p class="eyebrow">CONTINUIDADE</p>
      <h1>Histórico de edições</h1>
      <p class="muted">A experiência de uma equipe é o ponto de partida da próxima.</p>
    </div>
    <button v-if="isAdmin" class="primary" @click="creating = !creating">
      <Plus :size="18" />Nova edição
    </button>
  </div>
  <p v-if="error" class="error notice" role="alert">{{ error }}</p>
  <section v-if="creating" class="editor">
    <h2>Criar edição fictícia</h2>
    <form @submit.prevent="create">
      <fieldset :disabled="busy">
        <label>Nome<input v-model="name" required minlength="3" maxlength="200" /></label>
        <div class="form-grid">
          <label
            >Ano<input v-model.number="year" type="number" min="2020" max="2100" required /></label
          ><label>Data prevista<input v-model="date" type="date" required /></label>
        </div>
        <label>Local<input v-model="location" required minlength="3" maxlength="200" /></label
        ><label>Resumo e contexto<textarea v-model="summary" maxlength="2000" /></label
        ><button class="primary">{{ busy ? 'Criando…' : 'Criar edição' }}</button>
      </fieldset>
    </form>
  </section>
  <div class="history-grid">
    <article v-for="e in editions" :key="e.id" class="card history-card">
      <div class="section-head">
        <span class="year">{{ e.year }}</span
        ><span class="badge" :class="e.status">{{ labels[e.status] }}</span>
      </div>
      <h2>{{ e.name }}</h2>
      <p class="muted">{{ formatDate(e.event_date) }} · {{ e.location }}</p>
      <p>{{ e.summary || 'Nenhum resumo informado.' }}</p>
      <div class="history-actions">
        <button class="text-link" @click="open(e.id)">
          Consultar edição <ArrowRight :size="16" /></button
        ><button v-if="isAdmin && e.status !== 'archived'" class="secondary" @click="archive(e.id)">
          <Archive :size="15" />Arquivar
        </button>
      </div>
    </article>
  </div>
  <div v-if="!editions.length" class="empty card">Nenhuma edição vinculada ao seu acesso.</div>
  <aside class="notice">
    Cada edição preserva seus próprios envolvidos, atividades e decisões. Arquivadas permanecem
    disponíveis para a equipe vinculada.
  </aside>
</template>

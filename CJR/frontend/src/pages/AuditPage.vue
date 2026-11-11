<script setup lang="ts">
import { ref, watch } from 'vue';
import { selectedId } from '../entities/edition';
import { api } from '../shared/api';
import type { Audit } from '../entities/models';
import { labels, formatDate } from '../shared/format';
import PageState from '../shared/PageState.vue';
const items = ref<Audit[]>([]),
  loading = ref(false),
  error = ref('');
async function load() {
  if (!selectedId.value) return;
  loading.value = true;
  error.value = '';
  try {
    items.value = await api('/editions/' + selectedId.value + '/audit');
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
      <p class="eyebrow">RASTREABILIDADE</p>
      <h1>Trilha de auditoria</h1>
      <p class="muted">Um registro de autoria e mudanças para a continuidade da organização.</p>
    </div>
    <button class="secondary" @click="load">Atualizar registros</button>
  </div>
  <p class="notice">
    Últimos 200 registros da edição. A trilha não pode ser editada pela interface nem pela API.
  </p>
  <PageState :loading="loading" :error="error" @retry="load"
    ><section class="card">
      <article v-for="a in items" :key="a.id" class="audit-entry">
        <div class="section-head">
          <h2>{{ labels[a.action] || a.action }} · {{ labels[a.entity_type] || a.entity_type }}</h2>
          <small
            >#{{ a.id }} · {{ formatDate(a.created_at) }}
            {{ new Date(a.created_at).toLocaleTimeString('pt-BR') }}</small
          >
        </div>
        <p>
          <strong>{{ a.actor_name }}</strong>
          <span class="muted">· Referência {{ a.entity_id }}</span>
        </p>
        <details>
          <summary>Comparar antes e depois</summary>
          <div class="audit-diff">
            <div>
              <h3>Antes</h3>
              <pre>{{ JSON.stringify(a.before_data, null, 2) || 'Sem registro anterior' }}</pre>
            </div>
            <div>
              <h3>Depois</h3>
              <pre>{{ JSON.stringify(a.after_data, null, 2) }}</pre>
            </div>
          </div>
        </details>
      </article>
      <p v-if="!items.length" class="empty">Ainda não há alterações registradas nesta edição.</p>
    </section></PageState
  >
</template>

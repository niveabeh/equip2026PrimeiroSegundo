<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Plus } from 'lucide-vue-next';
import { selectedId, selectedEdition } from '../entities/edition';
import { canManage } from '../features/auth/model';
import { api, send } from '../shared/api';
import type { Stakeholder } from '../entities/models';
import PageState from '../shared/PageState.vue';
const items = ref<Stakeholder[]>([]),
  loading = ref(false),
  error = ref(''),
  creating = ref(false),
  busy = ref(false),
  message = ref(''),
  search = ref('');
const name = ref(''),
  category = ref('Parceiro'),
  responsibility = ref(''),
  contact = ref('');
const filtered = computed(() =>
  items.value.filter((i) =>
    [i.name, i.category, i.responsibility]
      .join(' ')
      .toLowerCase()
      .includes(search.value.toLowerCase()),
  ),
);
async function load() {
  if (!selectedId.value) return;
  loading.value = true;
  error.value = '';
  try {
    items.value = await api('/editions/' + selectedId.value + '/stakeholders');
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
watch(
  selectedId,
  () => {
    creating.value = false;
    load();
  },
  { immediate: true },
);
async function save() {
  busy.value = true;
  try {
    await api(
      '/editions/' + selectedId.value + '/stakeholders',
      send('POST', {
        name: name.value,
        category: category.value,
        responsibility: responsibility.value,
        contact: contact.value,
      }),
    );
    creating.value = false;
    name.value = '';
    responsibility.value = '';
    contact.value = '';
    message.value = 'Envolvido registrado com responsabilidade nesta edição.';
    await load();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="page-heading">
    <div>
      <p class="eyebrow">REDE DE ORGANIZAÇÃO</p>
      <h1>Envolvidos</h1>
      <p class="muted">Pessoas e organizações, com responsabilidades por edição.</p>
    </div>
    <button
      v-if="canManage && selectedEdition?.status !== 'archived'"
      class="primary"
      @click="creating = !creating"
    >
      <Plus :size="18" />Novo envolvido
    </button>
  </div>
  <p class="notice">
    Um envolvido não recebe acesso ao sistema. As contas são gerenciadas em Usuários e permissões.
  </p>
  <p v-if="message" class="success" role="status">{{ message }}</p>
  <section v-if="creating" class="editor">
    <h2>Novo envolvido fictício</h2>
    <form @submit.prevent="save">
      <fieldset :disabled="busy">
        <label>Nome<input v-model="name" required minlength="3" maxlength="200" /></label
        ><label
          >Categoria<select v-model="category">
            <option>Fornecedor</option>
            <option>Parceiro</option>
            <option>Voluntário</option>
            <option>Apoiador</option>
            <option>Outro</option>
          </select></label
        ><label
          >Responsabilidade nesta edição<input
            v-model="responsibility"
            required
            minlength="3"
            maxlength="200" /></label
        ><label
          >Contato fictício (opcional)<input
            v-model="contact"
            maxlength="200"
            placeholder="contato@example.test" /></label
        ><button class="primary">{{ busy ? 'Salvando…' : 'Salvar envolvido' }}</button>
      </fieldset>
    </form>
  </section>
  <PageState :loading="loading" :error="error" @retry="load"
    ><section class="card">
      <label class="standalone-search"
        >Buscar envolvidos<input v-model="search" placeholder="Nome, categoria ou responsabilidade"
      /></label>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Envolvido</th>
              <th>Categoria</th>
              <th>Responsabilidade</th>
              <th>Contato</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in filtered" :key="s.id">
              <td>
                <strong>{{ s.name }}</strong>
              </td>
              <td>
                <span class="badge">{{ s.category }}</span>
              </td>
              <td>{{ s.responsibility }}</td>
              <td>{{ s.contact || 'Não informado' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!filtered.length" class="empty">Nenhum envolvido encontrado nesta edição.</p>
    </section></PageState
  >
</template>

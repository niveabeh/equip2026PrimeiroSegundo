<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { api, send } from '../../shared/api';
import type { Activity, User } from '../../entities/models';
import { user, canManage } from '../../entities/session';
const props = defineProps<{ editionId: string; activity?: Activity }>();
const emit = defineEmits<{ saved: []; cancel: [] }>();
const form = reactive({
  title: props.activity?.title || '',
  description: props.activity?.description || '',
  owner_id: props.activity?.owner_id || user.value!.id,
  due_date: props.activity?.due_date.slice(0, 10) || '',
  status: props.activity?.status || 'pending',
  priority: props.activity?.priority || 'normal',
});
const members = ref<User[]>([]),
  error = ref(''),
  busy = ref(false);
onMounted(async () => {
  try {
    members.value = await api('/editions/' + props.editionId + '/members');
  } catch (e) {
    error.value = (e as Error).message;
  }
});
async function save() {
  busy.value = true;
  error.value = '';
  try {
    await api(
      props.activity
        ? '/activities/' + props.activity.id
        : '/editions/' + props.editionId + '/activities',
      send(
        props.activity ? 'PATCH' : 'POST',
        canManage.value
          ? { ...form, ...(props.activity ? { version: props.activity.version } : {}) }
          : { status: form.status, version: props.activity?.version },
      ),
    );
    emit('saved');
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <section class="editor" aria-labelledby="activity-editor-title">
    <div class="section-head">
      <h2 id="activity-editor-title">{{ activity ? 'Atualizar atividade' : 'Nova atividade' }}</h2>
      <button class="secondary" @click="emit('cancel')">Fechar</button>
    </div>
    <form @submit.prevent="save">
      <fieldset :disabled="busy">
        <template v-if="canManage"
          ><label
            >Título<input
              v-model="form.title"
              required
              minlength="3"
              maxlength="200"
              autofocus /></label
          ><label>Descrição<textarea v-model="form.description" maxlength="3000" rows="3" /></label>
          <div class="form-grid">
            <label
              >Responsável<select v-model="form.owner_id" required>
                <option v-for="m in members" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select></label
            ><label>Prazo<input type="date" v-model="form.due_date" required /></label
            ><label
              >Prioridade<select v-model="form.priority">
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
              </select></label
            >
          </div></template
        >
        <p v-else>{{ activity?.title }} — atualize o andamento da sua atividade.</p>
        <label
          >Situação<select v-model="form.status">
            <option value="pending">Pendente</option>
            <option value="doing">Em andamento</option>
            <option value="done">Concluída</option>
          </select></label
        >
        <p v-if="error" role="alert" class="error">{{ error }}</p>
        <button class="primary" type="submit">{{ busy ? 'Salvando…' : 'Salvar atividade' }}</button>
      </fieldset>
    </form>
  </section>
</template>

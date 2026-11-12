<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { api, send } from '../../shared/api';
import type { Activity, User, Stakeholder } from '../../entities/models';
import { user, canManage } from '../../entities/session';
const props = defineProps<{
  editionId: string;
  activity?: Activity;
  defaults?: Partial<Activity>;
}>();
const emit = defineEmits<{ saved: []; cancel: [] }>();
const form = reactive({
  title: props.activity?.title || props.defaults?.title || '',
  description: props.activity?.description || props.defaults?.description || '',
  owner_id: props.activity?.owner_id || props.defaults?.owner_id || user.value!.id,
  due_date: props.activity?.due_date.slice(0, 10) || '',
  status: props.activity?.status || 'pending',
  priority: props.activity?.priority || 'normal',
  phase: props.activity?.phase || props.defaults?.phase || 'before',
  stakeholder_id: props.activity?.stakeholder_id || props.defaults?.stakeholder_id || null,
});
const members = ref<User[]>([]),
  stakeholders = ref<Stakeholder[]>([]),
  error = ref(''),
  busy = ref(false);
onMounted(async () => {
  try {
    [members.value, stakeholders.value] = await Promise.all([
      api('/editions/' + props.editionId + '/members'),
      api('/editions/' + props.editionId + '/stakeholders'),
    ]);
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
          <label
            >Envolvido relacionado (opcional)<select v-model="form.stakeholder_id">
              <option :value="null">Atividade geral da organização</option>
              <option v-for="s in stakeholders" :key="s.id" :value="s.id">
                {{ s.name }} · {{ s.category }}
              </option>
            </select></label
          >
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
        <label v-if="canManage"
          >Etapa do evento<select v-model="form.phase">
            <option value="before">Antes do evento</option>
            <option value="during">Durante o evento</option>
            <option value="after">Depois do evento</option>
          </select></label
        >
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

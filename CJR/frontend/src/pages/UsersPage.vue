<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Plus } from 'lucide-vue-next';
import { api, send } from '../shared/api';
import { user } from '../features/auth/model';
import { editions } from '../entities/edition';
import type { User, Audit, Role } from '../entities/models';
import { labels, formatDate } from '../shared/format';
import PageState from '../shared/PageState.vue';
const users = ref<User[]>([]),
  audit = ref<Audit[]>([]),
  loading = ref(false),
  busy = ref(false),
  error = ref(''),
  message = ref(''),
  creating = ref(false);
const name = ref(''),
  email = ref(''),
  password = ref(''),
  role = ref<Role>('collaborator'),
  bindUser = ref(''),
  bindEdition = ref(editions.value.find((e) => e.status !== 'archived')?.id || '');
async function load() {
  loading.value = true;
  error.value = '';
  try {
    [users.value, audit.value] = await Promise.all([api('/users'), api('/admin/audit')]);
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
onMounted(load);
async function create() {
  busy.value = true;
  error.value = '';
  try {
    await api(
      '/users',
      send('POST', {
        name: name.value,
        email: email.value,
        password: password.value,
        role: role.value,
      }),
    );
    creating.value = false;
    password.value = '';
    name.value = '';
    email.value = '';
    message.value = 'Conta criada. Vincule a pessoa à edição para liberar o acesso.';
    await load();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function update(u: User, nextRole: Role, active: boolean) {
  busy.value = true;
  error.value = '';
  try {
    await api('/users/' + u.id, send('PATCH', { role: nextRole, active }));
    message.value = 'Permissões atualizadas. A mudança já vale nas próximas requisições.';
    await load();
  } catch (e) {
    await load();
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function bind() {
  busy.value = true;
  try {
    await api('/editions/' + bindEdition.value + '/members/' + bindUser.value, send('PUT', {}));
    message.value = 'Pessoa vinculada à edição.';
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
      <p class="eyebrow">ADMINISTRAÇÃO INSTITUCIONAL</p>
      <h1>Usuários e permissões</h1>
      <p class="muted">Acesso proporcional à responsabilidade de cada pessoa.</p>
    </div>
    <button class="primary" @click="creating = !creating"><Plus :size="18" />Novo usuário</button>
  </div>
  <div class="role-grid">
    <article class="card">
      <h2>Administrador</h2>
      <p>Cria e arquiva edições, gerencia contas, perfis e vínculos. Acessa todas as edições.</p>
    </article>
    <article class="card">
      <h2>Coordenador</h2>
      <p>
        Organiza atividades, atribui responsáveis e registra decisões e envolvidos nas edições
        vinculadas.
      </p>
    </article>
    <article class="card">
      <h2>Colaborador</h2>
      <p>
        Consulta as edições vinculadas e atualiza a situação das atividades sob sua
        responsabilidade.
      </p>
    </article>
  </div>
  <p v-if="message" class="success" role="status">{{ message }}</p>
  <p v-if="error" class="notice error" role="alert">{{ error }}</p>
  <section v-if="creating" class="editor">
    <h2>Nova conta de demonstração</h2>
    <form @submit.prevent="create">
      <fieldset :disabled="busy">
        <label>Nome fictício<input v-model="name" required minlength="3" maxlength="200" /></label
        ><label
          >E-mail fictício<input v-model="email" type="email" required maxlength="200" /></label
        ><label
          >Senha inicial (mínimo de 12 caracteres)<input
            v-model="password"
            type="password"
            required
            minlength="12"
            maxlength="100"
            autocomplete="new-password" /></label
        ><label
          >Perfil<select v-model="role">
            <option value="collaborator">Colaborador operacional</option>
            <option value="coordinator">Coordenador de edição</option>
            <option value="admin">Administrador institucional</option>
          </select></label
        ><button class="primary">Criar conta</button>
      </fieldset>
    </form>
  </section>
  <PageState :loading="loading"
    ><section class="card">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Pessoa</th>
              <th>Perfil</th>
              <th>Acesso</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>
                <strong>{{ u.name }}</strong><small>{{ u.email }}</small>
              </td>
              <td>
                <select
                  :value="u.role"
                  :disabled="busy || u.id === user?.id"
                  :aria-label="'Perfil de ' + u.name"
                  @change="update(u, ($event.target as HTMLSelectElement).value as Role, u.active)"
                >
                  <option value="admin">Administrador</option>
                  <option value="coordinator">Coordenador</option>
                  <option value="collaborator">Colaborador</option>
                </select>
              </td>
              <td>
                <span class="badge" :class="u.active ? 'done' : 'pending'">{{
                  u.active ? 'Ativo' : 'Inativo'
                }}</span>
              </td>
              <td>
                <button
                  class="secondary"
                  :disabled="busy || u.id === user?.id"
                  @click="update(u, u.role, !u.active)"
                >
                  {{ u.active ? 'Desativar' : 'Reativar' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section></PageState
  >
  <section class="card membership">
    <h2>Vincular pessoa a uma edição</h2>
    <p class="muted">
      Administradores já têm acesso global. Coordenadores e colaboradores precisam de vínculo.
    </p>
    <form class="form-grid" @submit.prevent="bind">
      <label
        >Pessoa<select v-model="bindUser" required>
          <option value="" disabled>Selecionar pessoa</option>
          <option
            v-for="u in users.filter((u) => u.active && u.role !== 'admin')"
            :key="u.id"
            :value="u.id"
          >
            {{ u.name }}
          </option>
        </select></label
      ><label
        >Edição<select v-model="bindEdition" required>
          <option
            v-for="e in editions.filter((e) => e.status !== 'archived')"
            :key="e.id"
            :value="e.id"
          >
            {{ e.name }}
          </option>
        </select></label
      ><button class="primary align-end" :disabled="busy">Vincular acesso</button>
    </form>
  </section>
  <section class="card recent">
    <h2>Auditoria administrativa</h2>
    <p class="muted">Últimas alterações de contas e vínculos, com os dados públicos do usuário.</p>
    <article
      v-for="a in audit.filter((a) => ['user', 'membership'].includes(a.entity_type)).slice(0, 20)"
      :key="a.id"
      class="audit-entry"
    >
      <p>
        {{ a.actor_name }} · {{ labels[a.action] }} · {{ labels[a.entity_type] }} ·
        {{ formatDate(a.created_at) }}
      </p>
      <details>
        <summary>Ver alteração</summary>
        <pre>{{ JSON.stringify({ antes: a.before_data, depois: a.after_data }, null, 2) }}</pre>
      </details>
    </article>
  </section>
</template>

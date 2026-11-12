<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Plus, UserRoundPlus, ShieldCheck, Search, ArrowUpRight, Users } from 'lucide-vue-next';
import { api, send } from '../shared/api';
import { user } from '../features/auth/model';
import { editions } from '../entities/edition';
import type { User, Audit, Role } from '../entities/models';
import { labels, formatDate } from '../shared/format';
import Modal from '../shared/Modal.vue';
import Pagination from '../shared/Pagination.vue';
import PageState from '../shared/PageState.vue';
import { useFitPageSize } from '../shared/useViewport';
const users = ref<User[]>([]),
  audit = ref<Audit[]>([]),
  loading = ref(false),
  busy = ref(false),
  error = ref(''),
  message = ref(''),
  creating = ref(false),
  binding = ref(false),
  search = ref(''),
  tab = ref('users'),
  page = ref(1),
  selectedAudit = ref<Audit>();
const name = ref(''),
  email = ref(''),
  password = ref(''),
  role = ref<Role>('collaborator'),
  bindUser = ref(''),
  bindEdition = ref(editions.value.find((e) => e.status !== 'archived')?.id || '');
const { region: fitRegion, size } = useFitPageSize(156, 96, 8);
const filtered = computed(() =>
    users.value.filter((u) =>
      [u.name, u.email, labels[u.role]]
        .join(' ')
        .toLowerCase()
        .includes(search.value.toLowerCase()),
    ),
  ),
  rows = computed(() =>
    filtered.value.slice((page.value - 1) * size.value, page.value * size.value),
  ),
  accessAudit = computed(() =>
    audit.value.filter((a) => ['user', 'membership'].includes(a.entity_type)),
  ),
  auditRows = computed(() =>
    accessAudit.value.slice((page.value - 1) * size.value, page.value * size.value),
  );
watch([tab, search], () => (page.value = 1));
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
    message.value = 'Acesso atualizado e registrado na auditoria administrativa.';
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
  error.value = '';
  try {
    await api('/editions/' + bindEdition.value + '/members/' + bindUser.value, send('PUT', {}));
    binding.value = false;
    message.value = 'Pessoa vinculada à edição selecionada.';
    await load();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <section class="page-view users-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">Controle de acesso</p>
        <h1>Usuários e permissões<span class="heading-dot">.</span></h1>
        <p class="muted">As pessoas certas, com a responsabilidade e o acesso certos.</p>
      </div>
      <div class="heading-actions">
        <button class="secondary" @click="binding = true">
          <UserRoundPlus :size="16" />Vincular edição</button
        ><button class="primary" @click="creating = true"><Plus :size="17" />Novo usuário</button>
      </div>
    </header>
    <div class="permissions-strip">
      <span
        ><ShieldCheck :size="17" /><strong>Administrador</strong
        ><small>Edições e governança</small></span
      ><span
        ><Users :size="17" /><strong>Coordenador</strong
        ><small>Operação da edição vinculada</small></span
      ><span
        ><UserRoundPlus :size="17" /><strong>Colaborador</strong
        ><small>Situação das próprias atividades</small></span
      >
    </div>
    <div class="board-toolbar">
      <div class="segmented">
        <button :class="{ active: tab === 'users' }" @click="tab = 'users'">Contas e perfis</button
        ><button :class="{ active: tab === 'audit' }" @click="tab = 'audit'">
          Auditoria de acesso
        </button>
      </div>
      <label v-if="tab === 'users'" class="search"
        ><Search :size="16" /><input
          v-model="search"
          placeholder="Buscar nome, e-mail ou perfil"
          aria-label="Buscar usuários"
      /></label>
    </div>
    <p v-if="message" class="compact-message" role="status">{{ message }}</p>
    <p v-if="error" class="compact-message error" role="alert">{{ error }}</p>
    <PageState :loading="loading"
      ><section ref="fitRegion" class="directory-panel page-region">
        <div v-if="tab === 'users'" class="users-table">
          <table>
            <thead>
              <tr>
                <th>Pessoa</th>
                <th>Perfil de acesso</th>
                <th>Situação</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in rows" :key="u.id">
                <td>
                  <strong>{{ u.name }}</strong><small>{{ u.email }}</small>
                </td>
                <td>
                  <select
                    :value="u.role"
                    :disabled="busy || u.id === user?.id"
                    :aria-label="'Perfil de ' + u.name"
                    @change="
                      update(u, ($event.target as HTMLSelectElement).value as Role, u.active)
                    "
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
                    {{ u.id === user?.id ? 'Sua conta' : u.active ? 'Desativar' : 'Reativar' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="!rows.length" class="empty">Nenhuma pessoa encontrada.</p>
        </div>
        <div v-else class="access-audit-list">
          <button
            v-for="a in auditRows"
            :key="a.id"
            class="access-audit-row"
            @click="selectedAudit = a"
          >
            <span class="stat-icon blue"><ShieldCheck :size="17" /></span>
            <div>
              <strong>{{ labels[a.action] }} · {{ labels[a.entity_type] }}</strong
              ><small>{{ a.actor_name }} · {{ formatDate(a.created_at) }}</small>
            </div>
            <ArrowUpRight :size="15" />
          </button>
          <p v-if="!accessAudit.length" class="empty">
            Alterações em contas e vínculos aparecerão aqui.
          </p>
        </div>
        <Pagination
          v-model:page="page"
          :total="tab === 'users' ? filtered.length : accessAudit.length"
          :size="size"
          :label="tab === 'users' ? 'Usuários' : 'Auditoria de acesso'"
        /></section
    ></PageState>
    <div class="page-caption">
      <span>Perfis são verificados pelo servidor em cada requisição.</span
      ><span>Envolvidos não recebem login automaticamente.</span>
    </div>
    <Modal v-if="creating" title="Nova conta de demonstração" @close="creating = false"
      ><form @submit.prevent="create">
        <fieldset :disabled="busy">
          <label
            >Nome fictício<input
              v-model="name"
              required
              minlength="3"
              maxlength="200"
              autofocus /></label
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
          >
          <p v-if="error" class="error" role="alert">{{ error }}</p>
          <button class="primary">Criar conta</button>
        </fieldset>
      </form></Modal
    >
    <Modal v-if="binding" title="Vincular pessoa a uma edição" @close="binding = false"
      ><p class="form-intro">
        Coordenadores e colaboradores precisam de vínculo por edição. Administradores possuem acesso
        global.
      </p>
      <form @submit.prevent="bind">
        <fieldset :disabled="busy">
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
          >
          <p v-if="error" class="error" role="alert">{{ error }}</p>
          <button class="primary">Vincular acesso</button>
        </fieldset>
      </form></Modal
    >
    <Modal v-if="selectedAudit" title="Mudança de acesso" wide @close="selectedAudit = undefined"
      ><p class="form-intro">
        {{ selectedAudit.actor_name }} · {{ labels[selectedAudit.action] }} ·
        {{ formatDate(selectedAudit.created_at) }}
      </p>
      <div class="audit-diff">
        <section>
          <h3>Antes</h3>
          <pre>{{
            JSON.stringify(selectedAudit.before_data, null, 2) || 'Sem registro anterior'
          }}</pre>
        </section>
        <section>
          <h3>Depois</h3>
          <pre>{{ JSON.stringify(selectedAudit.after_data, null, 2) }}</pre>
        </section>
      </div></Modal
    >
  </section>
</template>

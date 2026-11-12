<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Bot, ArrowUpRight, ShieldCheck, GitBranch } from 'lucide-vue-next';
import { login } from '../features/auth/model';
import { loadEditions } from '../entities/edition';
import RoboticsMark from '../shared/RoboticsMark.vue';
import Modal from '../shared/Modal.vue';
const email = ref('admin@example.test'),
  password = ref(''),
  error = ref(''),
  busy = ref(false),
  accounts = ref(false),
  router = useRouter();
async function enter() {
  busy.value = true;
  error.value = '';
  try {
    await login(email.value, password.value);
    await loadEditions();
    router.push('/');
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="login-page">
    <section class="login-story">
      <div class="brand">
        <span class="brand-icon"><Bot :size="27" /></span
        ><span>CJR<span class="brand-sub">GESTÃO • ROBÓTICA</span></span>
      </div>
      <div class="login-narrative">
        <span class="section-kicker">CAMPEONATO JOINVILENSE DE ROBÓTICA</span>
        <h1>O evento evolui.<br />A memória<br /><span>permanece.</span></h1>
        <p>
          Uma operação conectada, da primeira atividade ao conhecimento que fica para a próxima
          equipe.
        </p>
        <div class="login-proof">
          <GitBranch :size="21" />
          <div>
            <strong>Cada mudança conta uma história.</strong
            ><span>Autoria, contexto e continuidade na mesma trilha.</span>
          </div>
        </div>
      </div>
      <RoboticsMark />
      <footer>
        <span>Prefeitura de Joinville · Organização do CJR</span
        ><small>Protótipo acadêmico · dados fictícios</small>
      </footer>
    </section>
    <section class="login-form">
      <div>
        <span class="section-kicker"><ShieldCheck :size="16" />CENTRO DE OPERAÇÕES</span>
        <h2>Conecte-se à edição.</h2>
        <p class="muted">Entre para organizar o presente e preservar o próximo passo.</p>
        <form @submit.prevent="enter">
          <label
            >E-mail<input
              v-model="email"
              type="email"
              autocomplete="username"
              required
              maxlength="200" /></label
          ><label
            >Senha<input
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
              maxlength="200"
          /></label>
          <p v-if="error" class="error" role="alert">{{ error }}</p>
          <button class="primary full" :disabled="busy">
            {{ busy ? 'Entrando…' : 'Entrar no CJR' }}<ArrowUpRight :size="18" />
          </button>
        </form>
        <button class="demo-account-button" @click="accounts = true">
          Explorar contas de demonstração<ArrowUpRight :size="13" />
        </button>
        <p class="disclaimer">
          Sistema administrativo para o contexto do CJR. Demonstração acadêmica, sem comprovação de
          implantação ou autorização de marca institucional.
        </p>
      </div>
    </section>
    <Modal v-if="accounts" title="Contas de demonstração" @close="accounts = false"
      ><p class="form-intro">Todos os dados são fictícios. Senha: <code>Demo@2026!</code></p>
      <dl class="detail-facts">
        <div>
          <dt>Administrador institucional</dt>
          <dd>admin@example.test</dd>
        </div>
        <div>
          <dt>Coordenador de edição</dt>
          <dd>coordenador@example.test</dd>
        </div>
        <div>
          <dt>Colaborador operacional</dt>
          <dd>colaborador@example.test</dd>
        </div>
        <div>
          <dt>Relacionamento com patrocinadores</dt>
          <dd>relacionamento@example.test</dd>
        </div>
        <div>
          <dt>Infraestrutura</dt>
          <dd>infraestrutura@example.test</dd>
        </div>
      </dl></Modal
    >
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Bot, ArrowRight, ShieldCheck } from 'lucide-vue-next';
import { login } from '../features/auth/model';
import { loadEditions } from '../entities/edition';
const email = ref('admin@example.test'),
  password = ref(''),
  error = ref(''),
  busy = ref(false),
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
        <span class="brand-icon"><Bot /></span
        ><span>CJR<span class="brand-sub">GESTÃO • ROBÓTICA</span></span>
      </div>
      <div>
        <p class="eyebrow">CADA EDIÇÃO, UM NOVO CAPÍTULO</p>
        <h1>O conhecimento fica.<br />A próxima edição<br />começa melhor.</h1>
        <p>
          Organize responsabilidades, registre decisões e conecte a experiência de quem faz o evento
          acontecer.
        </p>
        <div class="story-line">
          <span>01 · Organizar</span><span>02 · Rastrear</span><span>03 · Continuar</span>
        </div>
      </div>
      <small>Campeonato Joinvilense de Robótica · Protótipo acadêmico</small>
    </section>
    <section class="login-form">
      <div>
        <span class="section-kicker"><ShieldCheck :size="17" /> ACESSO ADMINISTRATIVO</span>
        <h2>Bem-vindo ao CJR</h2>
        <p class="muted">Entre para acompanhar a organização da edição.</p>
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
            {{ busy ? 'Entrando…' : 'Entrar na plataforma' }}<ArrowRight :size="18" />
          </button>
        </form>
        <details class="demo-accounts">
          <summary>Contas para explorar a demonstração</summary>
          <p>Senha de todas: <code>Demo@2026!</code></p>
          <p>admin@example.test<br />coordenador@example.test<br />colaborador@example.test</p>
        </details>
        <p class="disclaimer">
          Dados totalmente fictícios. Este protótipo não representa um sistema oficial da Prefeitura
          de Joinville.
        </p>
      </div>
    </section>
  </div>
</template>

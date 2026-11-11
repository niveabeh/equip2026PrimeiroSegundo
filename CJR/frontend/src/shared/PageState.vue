<script setup lang="ts">
defineProps<{ loading?: boolean; error?: string }>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <p v-if="loading" class="notice" role="status">Carregando informações…</p>
  <div v-else-if="error" class="notice error" role="alert">
    {{ error }} <button class="secondary" @click="$emit('retry')">Tentar novamente</button>
  </div>
  <slot v-else />
</template>

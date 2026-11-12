<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { X } from 'lucide-vue-next';
defineProps<{ title: string; wide?: boolean }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement | null>(null);
onMounted(() => dialog.value?.showModal());
</script>
<template>
  <Teleport to="body"
    ><dialog
      ref="dialog"
      class="modal"
      :class="{ 'modal-wide': wide }"
      :aria-label="title"
      @cancel.prevent="emit('close')"
      @click="$event.target === dialog && emit('close')"
    >
      <header class="modal-header">
        <div>
          <span class="section-kicker">CJR • CENTRO DE OPERAÇÕES</span>
          <h2>{{ title }}</h2>
        </div>
        <button class="icon-button" aria-label="Fechar janela" @click="emit('close')">
          <X :size="20" />
        </button>
      </header>
      <div class="modal-body"><slot /></div></dialog
  ></Teleport>
</template>

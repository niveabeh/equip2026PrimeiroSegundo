<script setup lang="ts">
import { computed, watch } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
const props = withDefaults(
  defineProps<{ page: number; total: number; size: number; label?: string }>(),
  { label: 'Registros' },
);
const emit = defineEmits<{ 'update:page': [value: number] }>();
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.size)));
watch(pages, () => {
  if (props.page > pages.value) emit('update:page', pages.value);
});
</script>
<template>
  <nav class="pagination" :aria-label="label">
    <span
      >{{ total ? (page - 1) * size + 1 : 0 }}–{{ Math.min(page * size, total) }}
      <span class="muted">de {{ total }}</span></span
    >
    <div>
      <button
        class="icon-button"
        :disabled="page <= 1"
        :aria-label="'Página anterior: ' + label"
        @click="emit('update:page', page - 1)"
      >
        <ChevronLeft :size="16" /></button
      ><span>{{ page }} / {{ pages }}</span
      ><button
        class="icon-button"
        :disabled="page >= pages"
        :aria-label="'Próxima página: ' + label"
        @click="emit('update:page', page + 1)"
      >
        <ChevronRight :size="16" />
      </button>
    </div>
  </nav>
</template>

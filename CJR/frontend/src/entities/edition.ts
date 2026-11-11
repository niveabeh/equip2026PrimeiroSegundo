import { ref, computed } from 'vue';
import { api } from '../shared/api';
import type { Edition } from './models';
export const editions = ref<Edition[]>([]);
export const selectedId = ref(sessionStorage.getItem('cjr-edition') || '');
export const selectedEdition = computed(() =>
  editions.value.find((e) => e.id === selectedId.value),
);
export async function loadEditions() {
  editions.value = await api<Edition[]>('/editions');
  if (!editions.value.some((e) => e.id === selectedId.value))
    selectedId.value = editions.value[0]?.id || '';
}
export function selectEdition(id: string) {
  selectedId.value = id;
  sessionStorage.setItem('cjr-edition', id);
}

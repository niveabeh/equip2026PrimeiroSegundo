import { ref, computed } from 'vue';
import type { User } from './models';

export const user = ref<User | null>(null);
export const canManage = computed(() => !!user.value && user.value.role !== 'collaborator');
export const isAdmin = computed(() => user.value?.role === 'admin');

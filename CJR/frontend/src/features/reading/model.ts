import { ref } from 'vue';
export const largeText = ref(localStorage.getItem('cjr-text-size') === 'large');
document.documentElement.dataset.textSize = largeText.value ? 'large' : 'standard';
export function toggleTextSize() {
  largeText.value = !largeText.value;
  const size = largeText.value ? 'large' : 'standard';
  document.documentElement.dataset.textSize = size;
  localStorage.setItem('cjr-text-size', size);
  window.dispatchEvent(new Event('resize'));
}

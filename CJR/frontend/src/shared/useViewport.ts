import { ref, computed, onMounted, onBeforeUnmount, watch, unref, type Ref } from 'vue';
export function useViewport() {
  const height = ref(window.innerHeight),
    width = ref(window.innerWidth);
  const resize = () => {
    height.value = window.innerHeight;
    width.value = window.innerWidth;
  };
  onMounted(() => window.addEventListener('resize', resize));
  onBeforeUnmount(() => window.removeEventListener('resize', resize));
  return {
    height,
    width,
    compact: computed(() => width.value < 1000),
    short: computed(() => height.value < 700),
  };
}

/** Pagina pelo espaço real da região; mensagens e telas menores reduzem a quantidade visível. */
export function useFitPageSize(
  rowHeight: number | Ref<number>,
  reserved: number | Ref<number> = 0,
  max = 8,
) {
  const region = ref<HTMLElement | null>(null),
    available = ref(0);
  const fontScale = ref(parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1);
  const updateScale = () => {
    fontScale.value = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1;
  };
  onMounted(() => window.addEventListener('resize', updateScale));
  let observer: ResizeObserver | undefined;
  watch(
    region,
    (target) => {
      observer?.disconnect();
      if (!target) {
        available.value = 0;
        return;
      }
      observer = new ResizeObserver((entries) => {
        available.value = entries[0]?.contentRect.height || 0;
      });
      observer.observe(target);
      available.value = target.clientHeight;
    },
    { flush: 'post' },
  );
  onBeforeUnmount(() => {
    observer?.disconnect();
    window.removeEventListener('resize', updateScale);
  });
  const size = computed(() =>
    Math.max(
      1,
      Math.min(
        max,
        Math.floor(
          (available.value - unref(reserved) * fontScale.value) /
            (unref(rowHeight) * fontScale.value),
        ),
      ),
    ),
  );
  return { region, size };
}

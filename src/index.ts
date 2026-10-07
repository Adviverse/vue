import { defineComponent, h, onMounted, watch, type Ref } from 'vue';

export interface AdSlotOptions {
  tag: string;
  sizes?: string;
}

let registered: Promise<unknown> | null = null;

/** Registers <adviverse-ad> (client only; a no-op during SSR). */
function ensureElement(): Promise<unknown> {
  if (typeof window === 'undefined') return Promise.resolve();
  return (registered ||= import('@adviverse/element'));
}

/** <AdSlot tag="tk_…" sizes="300x250" /> — renders an <adviverse-ad> custom element. */
export const AdSlot = defineComponent({
  name: 'AdSlot',
  props: {
    tag: { type: String, required: true },
    sizes: { type: String, default: undefined },
  },
  setup(props) {
    onMounted(() => {
      void ensureElement();
    });
    return () => h('adviverse-ad', { tag: props.tag, sizes: props.sizes });
  },
});

/**
 * Composable for use on your own element ref:
 *   const el = ref(null); useAdSlot(el, { tag: 'tk_…', sizes: '300x250' });
 * Options may be a plain object or a getter (reactive updates re-render the slot).
 */
export function useAdSlot(
  elRef: Ref<{ setAttribute(k: string, v: string): void; removeAttribute?(k: string): void } | null>,
  opts: AdSlotOptions | (() => AdSlotOptions),
): void {
  const get = typeof opts === 'function' ? opts : () => opts;
  const apply = () => {
    const el = elRef.value;
    if (!el) return;
    const { tag, sizes } = get();
    el.setAttribute('tag', tag);
    if (sizes) el.setAttribute('sizes', sizes);
    else el.removeAttribute?.('sizes');
  };
  // Created synchronously in setup so Vue ties it to the component lifecycle;
  // apply() no-ops until the ref is populated.
  if (typeof opts === 'function') watch(get, apply);
  onMounted(async () => {
    await ensureElement();
    apply();
  });
}

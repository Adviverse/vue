import { test } from 'node:test';
import assert from 'node:assert/strict';

// 1. SSR safety: no window/document at import.
const { AdSlot, useAdSlot } = await import('./index.ts');
test('imports with no window/document (SSR-safe)', () => {
  assert.equal(typeof window, 'undefined');
  assert.ok(AdSlot && typeof useAdSlot === 'function');
});

// 2. Server render emits the element without touching window.
test('renders <adviverse-ad> on the server', async () => {
  const { createSSRApp } = await import('vue');
  const { renderToString } = await import('vue/server-renderer');
  const html = await renderToString(createSSRApp(AdSlot, { tag: 'tk_ssr', sizes: '300x250' }));
  assert.match(html, /<adviverse-ad[^>]*tag="tk_ssr"/);
  assert.equal(typeof window, 'undefined');
});

// 3. DOM + SDK stub (installed lazily so the SSR tests above run with no globals).
const rendered: any[] = [];
const destroyed: any[] = [];
const reg: Record<string, any> = {};
class El {
  attrs: Record<string, string> = {}; children: El[] = []; parent: El | null = null; isConnected = false; tagName: string;
  listeners: Record<string, any[]> = {};
  constructor(t = '') { this.tagName = t; }
  setAttribute(k: string, v: string) { const o = this.attrs[k] ?? null; this.attrs[k] = v; (this as any).attributeChangedCallback?.(k, o, v); }
  removeAttribute(k: string) { delete this.attrs[k]; }
  getAttribute(k: string) { return this.attrs[k] ?? null; }
  addEventListener(t: string, f: any) { (this.listeners[t] ||= []).push(f); }
  remove() {}
}
function installDom() {
  const g: any = globalThis;
  g.window = g;
  g.HTMLElement = El;
  g.customElements = { define: (n: string, c: any) => (reg[n] = c), get: (n: string) => reg[n] };
  g.document = {
    createElement: (t: string) => {
      const e = new El(t);
      if (t === 'script') queueMicrotask(() => {
        g.adviverse = { render: async (_e: any, o: any) => { rendered.push(o); }, destroy: (x: any) => destroyed.push(x), ready: (cb: () => void) => cb() };
        (e.listeners.load || []).forEach((f) => f());
      });
      return e;
    },
    head: { appendChild() {} },
    querySelector: () => null,
  };
}
const tick = () => new Promise((r) => setTimeout(r, 10));

test('AdSlot mount registers element, renders with tag, unmount destroys', async () => {
  installDom();
  const { createRenderer, h } = await import('vue');
  const patchProp = (el: El, k: string, _o: any, v: any) => { if (v == null) el.removeAttribute(k); else el.setAttribute(k, String(v)); };
  const r = createRenderer<El, El>({
    patchProp,
    insert: (el, parent) => { el.parent = parent; parent.children.push(el); if (parent.isConnected) { el.isConnected = true; (el as any).connectedCallback?.(); } },
    remove: (el) => { el.isConnected = false; (el as any).disconnectedCallback?.(); },
    createElement: (t) => new El(t),
    createText: () => new El('#t'), createComment: () => new El('#c'), setText() {}, setElementText() {},
    parentNode: (n) => n.parent, nextSibling: () => null,
  });
  const root = new El('root'); root.isConnected = true;
  const app = r.createApp({ render: () => h(AdSlot, { tag: 'tk_demo', sizes: '300x250' }) });
  app.mount(root);
  await tick();
  assert.ok(reg['adviverse-ad'], 'element registered on mount');
  const el = root.children[0];
  assert.equal(el.getAttribute('tag'), 'tk_demo');
  // element was created before registration (upgrade); simulate upgrade connect
  const up: any = new reg['adviverse-ad'](); up.attrs = { ...el.attrs }; up.isConnected = true; up.connectedCallback(); await tick();
  assert.ok(rendered.some((o) => o.tag === 'tk_demo' && o.sizes === '300x250'), 'render got tag');
  app.unmount();
  up.disconnectedCallback();
  assert.ok(destroyed.length >= 1, 'destroy called');
});

test('useAdSlot sets tag/sizes on the ref element after mount', async () => {
  installDom();
  const { createRenderer, h, ref } = await import('vue');
  const el = new El('adviverse-ad'); const elRef: any = ref(el);
  const r = createRenderer<El, El>({ patchProp() {}, insert() {}, remove() {}, createElement: (t) => new El(t),
    createText: () => new El(), createComment: () => new El(), setText() {}, setElementText() {}, parentNode: () => null, nextSibling: () => null });
  r.createApp({ setup() { useAdSlot(elRef, { tag: 'tk_c', sizes: '728x90' }); return () => h('div'); } }).mount(new El('root'));
  await tick();
  assert.equal(el.getAttribute('tag'), 'tk_c');
  assert.equal(el.getAttribute('sizes'), '728x90');
});

# @adviverse/vue

Vue 3 ad slots for [Adviverse](https://adviverse.com). Built on the
[`@adviverse/element`](https://github.com/Adviverse/element) `<adviverse-ad>` web component. SSR-safe (Nuxt-friendly): nothing touches `window` until mount.

## Install

```sh
npm i @adviverse/vue
```

## Usage

```vue
<script setup>
import { AdSlot } from '@adviverse/vue';
</script>

<template>
  <AdSlot tag="tk_…" sizes="300x250" />
</template>
```

Props: `tag` (required), `sizes` (optional). Changing a prop re-renders the slot.

### Composable

```vue
<script setup>
import { ref } from 'vue';
import { useAdSlot } from '@adviverse/vue';
const el = ref(null);
useAdSlot(el, { tag: 'tk_…', sizes: '300x250' });
</script>
<template><adviverse-ad ref="el" /></template>
```

### Using `<adviverse-ad>` directly

`adviverse-ad` is a custom element. If you use it in templates without `AdSlot`, tell Vue not to resolve it as a component:

```js
app.config.compilerOptions.isCustomElement = (t) => t === 'adviverse-ad';
```

(Vite: `vue({ template: { compilerOptions: { isCustomElement: (t) => t === 'adviverse-ad' } } })`.)

MIT

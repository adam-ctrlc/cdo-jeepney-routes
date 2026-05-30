<script setup>
/**
 * UiSelect — a styled native <select> with a custom chevron (the browser arrow
 * is hidden). Options are passed via the default slot; attributes (id, value,
 * @change, v-model, aria-*) fall through to the underlying <select>.
 *
 * @level Atom
 */
import { PhCaretDown } from '@phosphor-icons/vue'

defineOptions({ inheritAttrs: false })
</script>

<template>
  <div class="relative">
    <select
      v-bind="$attrs"
      class="h-9 w-full cursor-pointer appearance-none rounded-lg border border-border bg-surface-muted pl-2.5 pr-9 text-[0.84rem] text-text focus:border-accent focus:bg-surface focus:outline-2 focus:outline-offset-0 focus:outline-accent/30"
    >
      <slot />
    </select>
    <PhCaretDown
      class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted"
      :size="15"
      weight="bold"
    />
  </div>
</template>

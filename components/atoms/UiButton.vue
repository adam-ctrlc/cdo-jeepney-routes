<script setup>
/**
 * UiButton — text/icon button with a few variants. Attributes fall through to
 * the underlying <button>.
 *
 * @level Atom
 */
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'secondary' // 'primary' | 'secondary' | 'ghost'
  },
  block: {
    type: Boolean,
    default: false
  }
})

const base =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-60'

const variants = {
  primary:
    'min-h-[40px] px-3.5 bg-accent text-white hover:opacity-90 dark:text-[#18120a]',
  secondary:
    'min-h-[38px] px-3 border border-border bg-surface-muted text-accent-strong hover:bg-border/50 dark:border-[#343740] dark:bg-[#282b30] dark:text-[#f3d684]',
  ghost:
    'min-h-[38px] px-3 border border-border bg-surface text-accent-strong hover:bg-surface-muted dark:bg-[#1e2024] dark:text-text'
}

const classes = computed(() => [
  base,
  variants[props.variant] ?? variants.secondary,
  props.block && 'w-full'
])
</script>

<template>
  <button type="button" :class="classes">
    <slot />
  </button>
</template>

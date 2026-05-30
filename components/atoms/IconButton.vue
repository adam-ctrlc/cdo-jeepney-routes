<script setup>
/**
 * IconButton — square, icon-only ghost button. Attributes (type, aria-label,
 * @click, title) fall through to the underlying <button>.
 *
 * @level Atom
 */
</script>

<template>
  <button
    type="button"
    class="grid size-9 cursor-pointer place-items-center rounded-lg border border-border bg-surface text-accent-strong transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-60 dark:bg-[#1e2024] dark:text-text"
  >
    <slot />
  </button>
</template>

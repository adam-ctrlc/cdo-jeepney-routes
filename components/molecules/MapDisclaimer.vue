<script setup>
/**
 * MapDisclaimer — dismissible note clarifying that routes are LPTRP reference data.
 *
 * @level Molecule
 */
import { PhInfo, PhX } from '@phosphor-icons/vue'

defineEmits(['dismiss'])
</script>

<template>
  <div
    class="absolute bottom-[18px] left-3.5 right-[120px] z-[640] flex max-w-[760px] items-center gap-2.5 rounded-lg border border-[#eed587] bg-warning-bg/95 px-3 py-2.5 text-[0.86rem] leading-snug text-warning-text shadow-card max-nav:bottom-3 max-nav:left-2.5 max-nav:right-24 max-nav:max-w-none max-nav:text-[0.78rem]"
    role="note"
  >
    <PhInfo class="shrink-0" :size="18" weight="fill" />
    <span class="min-w-0">
      This map shows CDO LPTRP reference routes. Actual jeepney operations may still
      follow existing/status quo routes. Verify with jeepney signage, drivers, and current
      local transport advisories.
    </span>
    <button
      class="grid size-6 shrink-0 cursor-pointer place-items-center rounded-full border border-warning-text/30 bg-surface/40 text-warning-text transition-colors hover:bg-surface/70"
      type="button"
      aria-label="Dismiss route data disclaimer"
      @click="$emit('dismiss')"
    >
      <PhX :size="14" weight="bold" />
    </button>
  </div>
</template>

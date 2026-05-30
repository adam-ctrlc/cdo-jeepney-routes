<script setup>
/**
 * SidebarTabs — segmented control switching between the route list and the
 * trip planner.
 *
 * @level Molecule
 */
import { PhListBullets, PhPath } from '@phosphor-icons/vue'

defineProps({
  isFinderOpen: { type: Boolean, default: false }
})

defineEmits(['view-routes', 'plan-trip'])

const tab =
  'inline-flex min-h-[40px] cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const active =
  'bg-surface text-accent-strong shadow-sm dark:bg-[#282b30] dark:text-[#f3d684]'
const inactive = 'text-muted hover:text-accent-strong'
</script>

<template>
  <nav
    class="grid grid-cols-2 gap-1.5 rounded-2xl bg-surface-muted p-1 dark:bg-[#191a1e]"
    aria-label="Sidebar panels"
  >
    <button
      type="button"
      :class="[tab, !isFinderOpen ? active : inactive]"
      :aria-selected="String(!isFinderOpen)"
      @click="$emit('view-routes')"
    >
      <PhListBullets :size="17" weight="bold" />
      View Routes
    </button>
    <button
      type="button"
      :class="[tab, isFinderOpen ? active : inactive]"
      :aria-selected="String(isFinderOpen)"
      @click="$emit('plan-trip')"
    >
      <PhPath :size="17" weight="bold" />
      Plan Trip
    </button>
  </nav>
</template>

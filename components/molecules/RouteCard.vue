<script setup>
/**
 * RouteCard — a compact route in the 2-up grid. Clicking the card shows the
 * route on the map; the eye button opens the details modal.
 *
 * @level Molecule
 * @composition RouteColorTint, RouteCodeBadge
 */
import { PhEye } from '@phosphor-icons/vue'

defineProps({
  route: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  active: { type: Boolean, default: false }
})

defineEmits(['go-to-route', 'open-details'])
</script>

<template>
  <article
    class="route-card relative flex flex-col overflow-hidden rounded-md border transition-colors"
    :class="
      active
        ? 'border-accent bg-accent/10'
        : selected
          ? 'border-accent/50 bg-accent/5'
          : 'border-border bg-surface-muted hover:border-accent/40'
    "
  >
    <RouteColorTint :color="route.color" />
    <button
      class="absolute right-1.5 top-1.5 z-[2] grid size-7 cursor-pointer place-items-center rounded-md text-muted transition-colors hover:bg-surface hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-accent"
      type="button"
      :aria-label="`Details for ${route.code} ${route.name}`"
      @click="$emit('open-details')"
    >
      <PhEye :size="16" weight="bold" />
    </button>

    <button
      class="relative z-[1] flex cursor-pointer flex-col gap-1 p-2.5 pr-9 text-left"
      type="button"
      :aria-label="`Show ${route.code} ${route.name} on the map`"
      @click="$emit('go-to-route')"
    >
      <RouteCodeBadge
        :code="route.code"
        :for-clarification="route.status === 'for-clarification'"
      />
      <strong class="line-clamp-2 text-[0.9rem] font-bold leading-tight">
        {{ route.name }}
      </strong>
    </button>
  </article>
</template>

<style scoped>
.route-card:hover :deep(.route-color-tint) {
  opacity: 0.85;
}
</style>

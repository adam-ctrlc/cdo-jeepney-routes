<script setup>
/**
 * FinderResultCard — a single suggested trip (direct ride or transfer).
 *
 * @level Molecule
 */
import { computed } from 'vue'
import { PhArrowRight, PhCheckCircle, PhMapPin } from '@phosphor-icons/vue'

const props = defineProps({
  result: { type: Object, required: true },
  selected: { type: Boolean, default: false }
})

defineEmits(['select'])

function formatMeters(value) {
  if (!Number.isFinite(value)) return 'Unknown'
  if (value >= 1000) return `${(value / 1000).toFixed(1)} km`
  return `${Math.round(value)} m`
}

const isDirect = computed(() => props.result.type === 'direct')
</script>

<template>
  <button
    class="grid w-full cursor-pointer gap-1.5 rounded-2xl border bg-surface-muted p-3 text-left transition-colors"
    :class="
      selected
        ? 'border-accent bg-accent/5 dark:bg-[#2c2917]'
        : 'border-border hover:border-accent/50'
    "
    type="button"
    @click="$emit('select', result)"
  >
    <span
      class="inline-flex items-center gap-1.5 text-[0.66rem] font-extrabold uppercase tracking-wide text-accent"
    >
      <PhMapPin :size="12" weight="fill" />
      {{ isDirect ? 'Direct route' : 'Transfer route' }}
    </span>

    <strong v-if="isDirect" class="text-[0.95rem] font-bold leading-tight">
      {{ result.route.code }} {{ result.route.name }}
    </strong>
    <strong
      v-else
      class="inline-flex flex-wrap items-center gap-1 text-[0.95rem] font-bold leading-tight"
    >
      {{ result.firstRoute.code }}
      <PhArrowRight class="text-muted" :size="13" weight="bold" />
      {{ result.secondRoute.code }}
    </strong>

    <span class="grid gap-0.5 text-xs text-muted">
      <template v-if="isDirect">
        <span>{{ result.direction }}</span>
        <span>Walk to route ≈ {{ formatMeters(result.startWalkMeters) }}</span>
        <span>Ride ≈ {{ formatMeters(result.rideMeters) }}</span>
        <span>Walk to destination ≈ {{ formatMeters(result.endWalkMeters) }}</span>
      </template>
      <template v-else>
        <span>{{ result.firstRoute.name }} / {{ result.secondRoute.name }}</span>
        <span>Walk to first route ≈ {{ formatMeters(result.startWalkMeters) }}</span>
        <span>First ride ≈ {{ formatMeters(result.firstRideMeters) }}</span>
        <span>Transfer walk ≈ {{ formatMeters(result.transferWalkMeters) }}</span>
        <span>Second ride ≈ {{ formatMeters(result.secondRideMeters) }}</span>
        <span>Walk to destination ≈ {{ formatMeters(result.endWalkMeters) }}</span>
      </template>
    </span>

    <span
      class="inline-flex items-center gap-1 text-[0.74rem] font-bold text-accent-strong"
    >
      <PhCheckCircle v-if="selected" :size="14" weight="fill" />
      {{ selected ? 'Shown on map' : 'Show on map' }}
    </span>
  </button>
</template>

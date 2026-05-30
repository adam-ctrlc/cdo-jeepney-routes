<script setup>
/**
 * RouteFinder — trip planner: shows the selected points, runs the finder and
 * lists the suggested direct/transfer options.
 *
 * @level Organism
 * @composition FinderResultCard, UiButton
 */
import { computed } from 'vue'
import {
  PhArrowsDownUp,
  PhMapPin,
  PhMapPinLine,
  PhNavigationArrow,
  PhPersonSimpleWalk,
  PhTrash,
  PhWarning
} from '@phosphor-icons/vue'
import { VERY_SHORT_DISTANCE_METERS, WALKABLE_DISTANCE_METERS } from '~/lib/geo'

const props = defineProps({
  places: { type: Array, default: () => [] },
  startPoint: { type: Object, default: null },
  endPoint: { type: Object, default: null },
  directWalkMeters: { type: Number, default: null },
  directResults: { type: Array, required: true },
  transferResults: { type: Array, required: true },
  hasFinderRun: { type: Boolean, default: false },
  isFinderRunning: { type: Boolean, default: false },
  activeFinderResultKey: { type: String, default: '' },
  routeFinderOptions: { type: Object, required: true }
})

const emit = defineEmits([
  'clear-points',
  'reset-search',
  'swap-points',
  'find-routes',
  'show-result',
  'set-point'
])

function pickPlace(type, event) {
  const index = event.target.value
  if (index === '') return
  const place = props.places[Number(index)]
  if (place) emit('set-point', { type, point: { lat: place.lat, lng: place.lng } })
}

const hasBothPoints = computed(() => Boolean(props.startPoint && props.endPoint))
const hasAnyResults = computed(
  () => props.directResults.length > 0 || props.transferResults.length > 0
)
const isWalkableTrip = computed(
  () =>
    typeof props.directWalkMeters === 'number' &&
    props.directWalkMeters <= WALKABLE_DISTANCE_METERS
)
const walkNote = computed(() => {
  if (!hasBothPoints.value || typeof props.directWalkMeters !== 'number') return ''
  if (props.directWalkMeters <= VERY_SHORT_DISTANCE_METERS) {
    return 'These points are very close. Walking may be simpler for most people.'
  }
  if (props.directWalkMeters <= WALKABLE_DISTANCE_METERS) {
    return 'This may be walkable depending on weather, safety, mobility, and personal preference.'
  }
  return ''
})

function formatPoint(point) {
  if (!point) return 'Not set yet'
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`
}

function resultKey(result) {
  if (result.type === 'direct') {
    return `direct:${result.routeId}:${result.direction}`
  }
  return `transfer:${result.firstRouteId}:${result.firstDirection}:${result.secondRouteId}:${result.secondDirection}`
}
</script>

<template>
  <section class="grid gap-2.5 rounded-2xl bg-surface-muted p-3.5">
    <div class="grid gap-1">
      <h2 class="font-display m-0 text-[1.05rem] font-semibold tracking-tight">
        Plan Trip
      </h2>
      <p class="m-0 text-[0.84rem] leading-snug text-muted">
        Select a place, or click the map to drop a point.
      </p>
    </div>

    <div class="grid gap-2">
      <div
        class="grid grid-cols-[28px_1fr] items-start gap-2 rounded-xl bg-surface p-2.5"
      >
        <span
          class="mt-5 grid size-7 place-items-center rounded-full bg-accent text-white dark:text-[#18120a]"
        >
          <PhMapPin :size="15" weight="fill" />
        </span>
        <div class="grid min-w-0 gap-1">
          <label class="text-[0.72rem] font-bold text-muted" for="finder-start"
            >Start</label
          >
          <UiSelect id="finder-start" @change="pickPlace('start', $event)">
            <option value="">Select a place…</option>
            <option v-for="(place, index) in places" :key="index" :value="index">
              {{ place.name }}
            </option>
          </UiSelect>
          <span class="text-[0.72rem] text-muted">{{ formatPoint(startPoint) }}</span>
        </div>
      </div>

      <div
        class="grid grid-cols-[28px_1fr] items-start gap-2 rounded-xl bg-surface p-2.5"
      >
        <span
          class="mt-5 grid size-7 place-items-center rounded-full bg-[#cf4f2f] text-white"
        >
          <PhMapPin :size="15" weight="fill" />
        </span>
        <div class="grid min-w-0 gap-1">
          <label class="text-[0.72rem] font-bold text-muted" for="finder-end">
            Destination
          </label>
          <UiSelect id="finder-end" @change="pickPlace('end', $event)">
            <option value="">Select a place…</option>
            <option v-for="(place, index) in places" :key="index" :value="index">
              {{ place.name }}
            </option>
          </UiSelect>
          <span class="text-[0.72rem] text-muted">{{ formatPoint(endPoint) }}</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-1.5">
      <UiButton variant="secondary" @click="emit('clear-points')">
        <PhTrash :size="15" weight="bold" /> Clear
      </UiButton>
      <UiButton
        variant="secondary"
        :disabled="!hasBothPoints"
        @click="emit('swap-points')"
      >
        <PhArrowsDownUp :size="15" weight="bold" /> Swap
      </UiButton>
      <UiButton
        variant="primary"
        :disabled="!hasBothPoints || isFinderRunning"
        @click="emit('find-routes')"
      >
        <PhNavigationArrow :size="15" weight="fill" />
        {{ isFinderRunning ? 'Finding…' : 'Find' }}
      </UiButton>
    </div>

    <p
      v-if="isFinderRunning"
      class="m-0 rounded-lg border border-accent/20 bg-accent/10 px-2.5 py-2 text-[0.82rem] font-bold text-accent-strong dark:border-[#e6bd4f] dark:bg-[#2c2917]"
      role="status"
    >
      Checking route geometry near your selected points…
    </p>

    <div
      class="flex items-start gap-2 rounded-xl border border-warning-text/20 bg-warning-bg px-3 py-2.5 text-[0.78rem] leading-snug text-warning-text"
      role="note"
    >
      <PhWarning class="mt-px shrink-0" :size="17" weight="fill" />
      <span>
        <b class="font-extrabold">Estimates only — please don't fully trust this.</b>
        Trip suggestions are rough guesses from route geometry and walking thresholds, and
        can be wrong. Always confirm with jeepney signage, drivers, and current local
        transport advisories before you travel.
      </span>
    </div>

    <div v-if="hasBothPoints" class="grid gap-3" aria-live="polite">
      <section v-if="walkNote" class="grid gap-1.5">
        <h3 class="m-0 text-[0.9rem] font-bold">Walking note</h3>
        <p class="m-0 text-[0.84rem] leading-snug text-muted">{{ walkNote }}</p>
      </section>

      <section v-if="hasFinderRun && hasAnyResults && isWalkableTrip">
        <h3 class="m-0 text-[0.9rem] font-bold">
          Jeepney options if walking is not preferred
        </h3>
      </section>

      <section v-if="directResults.length" class="grid gap-1.5">
        <h3 class="m-0 text-[0.9rem] font-bold">Possible direct routes</h3>
        <FinderResultCard
          v-for="result in directResults"
          :key="`${result.routeId}-${result.direction}`"
          :result="result"
          :selected="activeFinderResultKey === resultKey(result)"
          @select="emit('show-result', $event)"
        />
      </section>

      <section v-if="transferResults.length" class="grid gap-1.5">
        <h3 class="m-0 text-[0.9rem] font-bold">Possible transfer routes</h3>
        <FinderResultCard
          v-for="result in transferResults"
          :key="`${result.firstRouteId}-${result.firstDirection}-${result.secondRouteId}-${result.secondDirection}`"
          :result="result"
          :selected="activeFinderResultKey === resultKey(result)"
          @select="emit('show-result', $event)"
        />
      </section>

      <EmptyState
        v-if="hasFinderRun && !hasAnyResults && isWalkableTrip"
        title="Looks walkable"
        message="No jeepney route was found within the current walking threshold, but the points may be walkable."
      >
        <PhPersonSimpleWalk :size="32" weight="duotone" />
      </EmptyState>
      <EmptyState
        v-else-if="hasFinderRun && !hasAnyResults"
        title="No routes found"
        message="Try increasing the walking threshold, or check whether the route data covers this area."
      >
        <PhMapPinLine :size="32" weight="duotone" />
      </EmptyState>
    </div>
  </section>
</template>

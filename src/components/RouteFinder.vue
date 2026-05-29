<script setup>
import { computed } from 'vue'
import {
  VERY_SHORT_DISTANCE_METERS,
  WALKABLE_DISTANCE_METERS
} from '../lib/geo'

const props = defineProps({
  startPoint: {
    type: Object,
    default: null
  },
  endPoint: {
    type: Object,
    default: null
  },
  directWalkMeters: {
    type: Number,
    default: null
  },
  directResults: {
    type: Array,
    required: true
  },
  transferResults: {
    type: Array,
    required: true
  },
  hasFinderRun: {
    type: Boolean,
    default: false
  },
  isFinderRunning: {
    type: Boolean,
    default: false
  },
  activeFinderResultKey: {
    type: String,
    default: ''
  },
  routeFinderOptions: {
    type: Object,
    required: true
  }
})

const emit = defineEmits([
  'clear-points',
  'reset-search',
  'swap-points',
  'find-routes',
  'show-result'
])

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

function formatMeters(value) {
  if (!Number.isFinite(value)) return 'Unknown'
  if (value >= 1000) return `${(value / 1000).toFixed(1)} km`
  return `${Math.round(value)} m`
}

function formatPoint(point) {
  if (!point) return 'Click the map'
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
  <section class="finder">
    <div class="section-heading">
      <h2>Plan Trip</h2>
      <p>Select start and destination points on the map.</p>
    </div>

    <div class="finder-points">
      <div>
        <span class="field-label">Start</span>
        <strong>{{ formatPoint(startPoint) }}</strong>
      </div>
      <div>
        <span class="field-label">Destination</span>
        <strong>{{ formatPoint(endPoint) }}</strong>
      </div>
    </div>

    <div class="finder-actions">
      <button class="secondary-button compact-button" type="button" @click="emit('clear-points')">
        Clear points
      </button>
      <button
        class="secondary-button compact-button"
        type="button"
        :disabled="!hasBothPoints"
        @click="emit('swap-points')"
      >
        Swap start/end
      </button>
      <button
        class="primary-button compact-button"
        type="button"
        :disabled="!hasBothPoints || isFinderRunning"
        @click="emit('find-routes')"
      >
        {{ isFinderRunning ? 'Finding routes...' : 'Find route' }}
      </button>
    </div>

    <p v-if="isFinderRunning" class="finder-status" role="status">
      Checking route geometry near your selected points...
    </p>

    <p class="finder-note">
      Suggested routes are approximate and depend on the current walking thresholds.
      Verify with actual jeepney signage and drivers.
    </p>

    <div v-if="hasBothPoints" class="finder-results" aria-live="polite">
      <section v-if="walkNote" class="result-section">
        <h3>Walking note</h3>
        <p class="empty-state">{{ walkNote }}</p>
      </section>

      <section v-if="hasFinderRun && hasAnyResults && isWalkableTrip" class="result-section">
        <h3>Jeepney options if walking is not preferred</h3>
      </section>

      <section v-if="directResults.length" class="result-section">
        <h3>Possible direct routes</h3>
        <button
          v-for="result in directResults"
          :key="`${result.routeId}-${result.direction}`"
          class="result-button"
          :class="{ selected: activeFinderResultKey === resultKey(result) }"
          type="button"
          @click="emit('show-result', result)"
        >
          <span>Possible direct route</span>
          <strong>{{ result.route.code }} {{ result.route.name }}</strong>
          <small>{{ result.direction }}</small>
          <small>Approximate walking distance to route: {{ formatMeters(result.startWalkMeters) }}</small>
          <small>Estimated ride distance: {{ formatMeters(result.rideMeters) }}</small>
          <small>Approximate walking distance to destination: {{ formatMeters(result.endWalkMeters) }}</small>
          <small>{{ result.reason }}</small>
          <b>{{ activeFinderResultKey === resultKey(result) ? 'Shown on map' : 'Show on map' }}</b>
        </button>
      </section>

      <section v-if="transferResults.length" class="result-section">
        <h3>Possible transfer routes</h3>
        <button
          v-for="result in transferResults"
          :key="`${result.firstRouteId}-${result.firstDirection}-${result.secondRouteId}-${result.secondDirection}`"
          class="result-button transfer"
          :class="{ selected: activeFinderResultKey === resultKey(result) }"
          type="button"
          @click="emit('show-result', result)"
        >
          <span>Possible transfer route</span>
          <strong>
            {{ result.firstRoute.code }} to {{ result.secondRoute.code }}
          </strong>
          <small>
            {{ result.firstRoute.name }} / {{ result.secondRoute.name }}
          </small>
          <small>Approximate walking distance to first route: {{ formatMeters(result.startWalkMeters) }}</small>
          <small>Estimated first ride distance: {{ formatMeters(result.firstRideMeters) }}</small>
          <small>Approximate transfer walk: {{ formatMeters(result.transferWalkMeters) }}</small>
          <small>Estimated second ride distance: {{ formatMeters(result.secondRideMeters) }}</small>
          <small>Approximate walking distance to destination: {{ formatMeters(result.endWalkMeters) }}</small>
          <small>{{ result.reason }}</small>
          <b>{{ activeFinderResultKey === resultKey(result) ? 'Shown on map' : 'Show on map' }}</b>
        </button>
      </section>

      <p v-if="hasFinderRun && !hasAnyResults && isWalkableTrip" class="empty-state">
        No jeepney route was found within the current walking threshold, but the points may be walkable.
      </p>
      <p v-else-if="hasFinderRun && !hasAnyResults" class="empty-state">
        No route match found yet. Try increasing the walking threshold or checking if the route data covers this area.
      </p>
    </div>
  </section>
</template>

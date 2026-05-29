<script setup>
import { ref, watch } from 'vue'
import RouteCard from './RouteCard.vue'
import RouteFinder from './RouteFinder.vue'

const props = defineProps({
  routes: {
    type: Array,
    required: true
  },
  finderRoutes: {
    type: Array,
    required: true
  },
  filteredRoutes: {
    type: Array,
    required: true
  },
  selectedRouteIds: {
    type: Array,
    required: true
  },
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
  isFinderOpen: {
    type: Boolean,
    default: false
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
  },
  searchQuery: {
    type: String,
    default: ''
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  errorMessage: {
    type: String,
    default: ''
  },
  theme: {
    type: String,
    default: 'light'
  }
})

const emit = defineEmits([
  'update:searchQuery',
  'toggle-route',
  'show-route',
  'show-all-routes',
  'clear-visible-routes',
  'reset-map',
  'clear-finder-points',
  'open-route-finder',
  'reset-finder-search',
  'swap-finder-points',
  'find-routes',
  'show-finder-result',
  'toggle-theme',
  'hide-sidebar',
  'close-mobile-menu'
])

const openDescriptionRouteId = ref('')

function switchToViewRoutes() {
  if (props.isFinderOpen) {
    emit('reset-finder-search')
  }
}

function switchToPlanTrip() {
  if (!props.isFinderOpen) {
    emit('open-route-finder')
  }
}

watch(
  () => props.selectedRouteIds.join('|'),
  () => {
    openDescriptionRouteId.value = ''
  }
)

function toggleRouteDescription(routeId) {
  openDescriptionRouteId.value =
    openDescriptionRouteId.value === routeId ? '' : routeId
}
</script>

<template>
  <aside class="sidebar">
    <header class="app-header">
      <button
        class="icon-text-button sidebar-close"
        type="button"
        @click="emit('hide-sidebar')"
      >
        Hide
      </button>
      <button
        class="icon-text-button mobile-drawer-close"
        type="button"
        @click="emit('close-mobile-menu')"
      >
        Close
      </button>
      <h1>CDO Jeepney Routes</h1>
      <button class="theme-toggle" type="button" @click="emit('toggle-theme')">
        {{ theme === 'dark' ? 'Light mode' : 'Dark mode' }}
      </button>
    </header>

    <nav class="sidebar-tabs" aria-label="Sidebar panels">
      <button
        class="tab-button"
        :class="{ active: !isFinderOpen }"
        type="button"
        :aria-selected="String(!isFinderOpen)"
        @click="switchToViewRoutes"
      >
        View Routes
      </button>
      <button
        class="tab-button"
        :class="{ active: isFinderOpen }"
        type="button"
        :aria-selected="String(isFinderOpen)"
        @click="switchToPlanTrip"
      >
        Plan Trip
      </button>
    </nav>

    <RouteFinder
      v-if="isFinderOpen"
      :routes="finderRoutes"
      :start-point="startPoint"
      :end-point="endPoint"
      :direct-walk-meters="directWalkMeters"
      :direct-results="directResults"
      :transfer-results="transferResults"
      :has-finder-run="hasFinderRun"
      :is-finder-running="isFinderRunning"
      :active-finder-result-key="activeFinderResultKey"
      :route-finder-options="routeFinderOptions"
      @clear-points="emit('clear-finder-points')"
      @reset-search="emit('reset-finder-search')"
      @swap-points="emit('swap-finder-points')"
      @find-routes="emit('find-routes')"
      @show-result="emit('show-finder-result', $event)"
    />

    <section v-else class="route-list" aria-label="Routes">
      <div class="list-heading">
        <h2>Routes</h2>
        <span>{{ selectedRouteIds.length }} visible</span>
      </div>
      <div class="route-list-controls">
        <label class="field-label" for="route-search">Search routes</label>
        <input
          id="route-search"
          class="text-input compact-input"
          type="search"
          :value="searchQuery"
          placeholder="Search by route name"
          @input="emit('update:searchQuery', $event.target.value)"
        />
        <div class="route-action-row">
          <button class="secondary-button compact-button" type="button" @click="emit('show-all-routes')">
            Show all
          </button>
          <button class="secondary-button compact-button" type="button" @click="emit('clear-visible-routes')">
            Hide all
          </button>
        </div>
        <p class="list-count">{{ filteredRoutes.length }} matching routes</p>
      </div>
      <p v-if="isLoading" class="empty-state">Loading routes...</p>
      <p v-else-if="errorMessage" class="empty-state error">{{ errorMessage }}</p>
      <p v-else-if="filteredRoutes.length === 0" class="empty-state">
        No routes match this search.
      </p>
      <RouteCard
        v-for="route in filteredRoutes"
        :key="route.id"
        :route="route"
        :selected="selectedRouteIds.includes(route.id)"
        :description-open="openDescriptionRouteId === route.id"
        @toggle-route="emit('toggle-route', route.id)"
        @toggle-description="toggleRouteDescription(route.id)"
      />
    </section>
  </aside>
</template>

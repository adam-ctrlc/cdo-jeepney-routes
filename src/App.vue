<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import MapView from './components/MapView.vue'
import RouteSidebar from './components/RouteSidebar.vue'
import {
  MAX_DIRECT_RESULTS,
  MAX_TRANSFER_RESULTS,
  MAX_TRANSFER_WALK_METERS,
  MAX_WALK_TO_ROUTE_METERS,
  TRANSFER_PENALTY_METERS,
  TRANSFER_WALK_WEIGHT,
  VERY_SHORT_DISTANCE_METERS,
  WALK_WEIGHT,
  WALKABLE_DISTANCE_METERS,
  RIDE_WEIGHT,
  findDirectRouteCandidates,
  findTransferRouteCandidates,
  hasValidRouteGeometry,
  haversineDistanceMeters,
  normalizeText,
  getRoutePathOptions
} from './lib/geo'

const routes = ref([])
const selectedRouteIds = ref([])
const searchQuery = ref('')
const isLoading = ref(true)
const errorMessage = ref('')
const isSidebarHidden = ref(false)
const isMobileMenuOpen = ref(false)
const sidebarWidth = ref(560)
const isResizing = ref(false)
const isAboutOpen = ref(false)
const theme = ref('light')
const isDisclaimerVisible = ref(true)
const startPoint = ref(null)
const endPoint = ref(null)
const transferPoint = ref(null)
const directResults = ref([])
const transferResults = ref([])
const hasFinderRun = ref(false)
const highlightedRouteIds = ref([])
const activeFinderResult = ref(null)
const activeFinderResultKey = ref('')
const isFinderRunning = ref(false)
const isFinderOpen = ref(false)

const routeFinderOptions = {
  maxWalkToRouteMeters: MAX_WALK_TO_ROUTE_METERS,
  maxTransferWalkMeters: MAX_TRANSFER_WALK_METERS,
  walkWeight: WALK_WEIGHT,
  rideWeight: RIDE_WEIGHT,
  transferWalkWeight: TRANSFER_WALK_WEIGHT,
  transferPenaltyMeters: TRANSFER_PENALTY_METERS,
  maxDirectResults: MAX_DIRECT_RESULTS,
  maxTransferResults: MAX_TRANSFER_RESULTS
}

const sortedRoutes = computed(() =>
  routes.value
    .filter((route) => route.status !== 'not-yet-operational')
    .sort((routeA, routeB) =>
      `${routeA.code} ${routeA.name}`.localeCompare(`${routeB.code} ${routeB.name}`)
    )
)

const visibleRoutes = computed(() => {
  const visibleIds = new Set(selectedRouteIds.value)
  return sortedRoutes.value.filter((route) => visibleIds.has(route.id))
})

const finderRoutes = computed(() =>
  sortedRoutes.value.filter((route) => route.status !== 'for-clarification')
)

const directWalkMeters = computed(() =>
  startPoint.value && endPoint.value
    ? haversineDistanceMeters(startPoint.value, endPoint.value)
    : null
)

const defaultVisibleRouteIds = computed(() =>
  sortedRoutes.value.map((route) => route.id)
)

const filteredRoutes = computed(() => {
  const query = normalizeText(searchQuery.value)
  if (!query) return sortedRoutes.value

  return sortedRoutes.value.filter((route) => {
    const searchable = [
      route.code,
      route.name,
      ...(route.areas ?? []),
      ...(route.landmarks ?? []),
      ...(route.transferPoints ?? []),
      ...(route.inbound?.streets ?? []),
      ...(route.outbound?.streets ?? []),
      ...((route.stops ?? []).map((stop) => stop.name))
    ]

    return searchable.some((value) => normalizeText(value).includes(query))
  })
})

function toggleRoute(routeId) {
  selectedRouteIds.value = selectedRouteIds.value.includes(routeId)
    ? selectedRouteIds.value.filter((id) => id !== routeId)
    : [...selectedRouteIds.value, routeId]
}

function showRoute(routeId) {
  if (!selectedRouteIds.value.includes(routeId)) {
    selectedRouteIds.value = [...selectedRouteIds.value, routeId]
  }
  highlightedRouteIds.value = [routeId]
  transferPoint.value = null
  activeFinderResult.value = null
}

function showAllRoutes() {
  selectedRouteIds.value = sortedRoutes.value.map((route) => route.id)
}

function showDefaultRoutes() {
  selectedRouteIds.value = defaultVisibleRouteIds.value
}

function clearVisibleRoutes() {
  selectedRouteIds.value = []
  highlightedRouteIds.value = []
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

function dismissDisclaimer() {
  isDisclaimerVisible.value = false
  localStorage.setItem('disclaimerDismissed', 'true')
}

function resetMap() {
  searchQuery.value = ''
  showDefaultRoutes()
}

function handleMapPointClick(point) {
  if (!isFinderOpen.value) return

  if (!startPoint.value) {
    startPoint.value = point
  } else if (!endPoint.value) {
    endPoint.value = point
  } else {
    startPoint.value = point
    endPoint.value = null
  }

  clearFinderResults()
}

function clearFinderResults() {
  directResults.value = []
  transferResults.value = []
  transferPoint.value = null
  highlightedRouteIds.value = []
  activeFinderResult.value = null
  activeFinderResultKey.value = ''
  hasFinderRun.value = false
  isFinderRunning.value = false
}

function clearFinderPoints() {
  startPoint.value = null
  endPoint.value = null
  clearFinderResults()
  showDefaultRoutes()
}

function swapFinderPoints() {
  const previousStart = startPoint.value
  startPoint.value = endPoint.value
  endPoint.value = previousStart
  clearFinderResults()
}

function finderResultKey(result) {
  if (!result) return ''
  if (result.type === 'direct') {
    return `direct:${result.routeId}:${result.direction}`
  }
  return `transfer:${result.firstRouteId}:${result.firstDirection}:${result.secondRouteId}:${result.secondDirection}`
}

function finderResultRouteIds(result) {
  if (!result) return []
  return result.type === 'direct'
    ? [result.routeId]
    : [result.firstRouteId, result.secondRouteId]
}

async function runRouteFinder() {
  if (!startPoint.value || !endPoint.value || isFinderRunning.value) return
  const loadingStartedAt = performance.now()

  const options = {
    maxWalkToRouteMeters: MAX_WALK_TO_ROUTE_METERS,
    maxTransferWalkMeters: MAX_TRANSFER_WALK_METERS,
    walkWeight: WALK_WEIGHT,
    rideWeight: RIDE_WEIGHT,
    transferWalkWeight: TRANSFER_WALK_WEIGHT,
    transferPenaltyMeters: TRANSFER_PENALTY_METERS,
    maxResults: MAX_DIRECT_RESULTS
  }
  isFinderRunning.value = true
  hasFinderRun.value = false
  activeFinderResult.value = null
  activeFinderResultKey.value = ''
  highlightedRouteIds.value = []
  transferPoint.value = null
  selectedRouteIds.value = []

  await nextTick()
  await new Promise((resolve) => window.setTimeout(resolve, 80))

  try {
    directResults.value = findDirectRouteCandidates(
      finderRoutes.value,
      startPoint.value,
      endPoint.value,
      options
    )
    transferResults.value = findTransferRouteCandidates(
      finderRoutes.value,
      startPoint.value,
      endPoint.value,
      { ...options, maxResults: MAX_TRANSFER_RESULTS }
    )
    transferPoint.value = null
    highlightedRouteIds.value = []
    activeFinderResult.value = null
    activeFinderResultKey.value = ''
    hasFinderRun.value = true

    const firstResult = directResults.value[0] ?? transferResults.value[0]
    if (firstResult) {
      showFinderResult(firstResult)
    }

    if (import.meta.env.DEV) {
      console.info('[route-finder]', {
        routesChecked: finderRoutes.value.length,
        validRoutePathsChecked: finderRoutes.value.reduce(
          (total, route) => total + getRoutePathOptions(route).length,
          0
        ),
        directCandidates: directResults.value.length,
        transferCandidates: transferResults.value.length,
        directWalkMeters: directWalkMeters.value,
        thresholds: {
          maxWalkToRouteMeters: MAX_WALK_TO_ROUTE_METERS,
          maxTransferWalkMeters: MAX_TRANSFER_WALK_METERS,
          walkableDistanceMeters: WALKABLE_DISTANCE_METERS,
          veryShortDistanceMeters: VERY_SHORT_DISTANCE_METERS
        }
      })
    }
  } finally {
    const elapsed = performance.now() - loadingStartedAt
    if (elapsed < 450) {
      await new Promise((resolve) => window.setTimeout(resolve, 450 - elapsed))
    }
    isFinderRunning.value = false
  }
}

function showFinderResult(result) {
  activeFinderResultKey.value = finderResultKey(result)
  selectedRouteIds.value = finderResultRouteIds(result)

  if (result.type === 'direct') {
    highlightedRouteIds.value = [result.routeId]
    transferPoint.value = null
    activeFinderResult.value = result
    return
  }

  const resultRouteIds = [result.firstRouteId, result.secondRouteId]
  highlightedRouteIds.value = resultRouteIds
  transferPoint.value = result.transferPoint
  activeFinderResult.value = result
}

function resetFinderSearch() {
  startPoint.value = null
  endPoint.value = null
  searchQuery.value = ''
  isFinderOpen.value = false
  clearFinderResults()
  showDefaultRoutes()
}

function openRouteFinder() {
  isFinderOpen.value = true
  searchQuery.value = ''
  clearFinderResults()
  selectedRouteIds.value = []
}

function updateFinderPoint({ type, point }) {
  if (type === 'start') {
    startPoint.value = point
  } else {
    endPoint.value = point
  }
  clearFinderResults()
}

function toggleSidebar() {
  isSidebarHidden.value = !isSidebarHidden.value
}

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false
}

function startSidebarResize(event) {
  if (window.innerWidth <= 800 || isSidebarHidden.value) return

  isResizing.value = true
  const startX = event.clientX
  const startWidth = sidebarWidth.value

  function onPointerMove(moveEvent) {
    const nextWidth = startWidth + moveEvent.clientX - startX
    sidebarWidth.value = Math.min(560, Math.max(280, nextWidth))
  }

  function onPointerUp() {
    isResizing.value = false
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }

  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function normalizeRouteGeometry(route) {
  return {
    ...route,
    inboundPath: route.inboundPath ?? route.paths?.inbound,
    outboundPath: route.outboundPath ?? route.paths?.outbound
  }
}

onMounted(async () => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark' || savedTheme === 'light') {
    theme.value = savedTheme
  }
  isDisclaimerVisible.value = localStorage.getItem('disclaimerDismissed') !== 'true'

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/routes.json`)
    if (!response.ok) throw new Error(`Unable to load routes: ${response.status}`)
    const loadedRoutes = (await response.json()).map(normalizeRouteGeometry)
    const validRoutes = loadedRoutes.filter(hasValidRouteGeometry)
    const skippedRoutes = loadedRoutes.filter((route) => !hasValidRouteGeometry(route))

    if (import.meta.env.DEV && skippedRoutes.length > 0) {
      console.warn(
        '[routes] skipped invalid route geometry',
        skippedRoutes.map((route) => route?.id ?? route?.name ?? '(unknown route)')
      )
    }

    routes.value = validRoutes
    showDefaultRoutes()
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
})

watch(
  theme,
  (nextTheme) => {
    document.documentElement.dataset.theme = nextTheme
    localStorage.setItem('theme', nextTheme)
  },
  { immediate: true }
)
</script>

<template>
  <div
    class="app-shell"
    :class="{
      'sidebar-hidden': isSidebarHidden,
      'mobile-menu-open': isMobileMenuOpen,
      resizing: isResizing
    }"
    :style="{ '--sidebar-width': `${sidebarWidth}px` }"
  >
    <RouteSidebar
      v-show="!isSidebarHidden"
      v-model:search-query="searchQuery"
      :routes="routes"
      :finder-routes="finderRoutes"
      :filtered-routes="filteredRoutes"
      :selected-route-ids="selectedRouteIds"
      :start-point="startPoint"
      :end-point="endPoint"
      :direct-walk-meters="directWalkMeters"
      :direct-results="directResults"
      :transfer-results="transferResults"
      :is-finder-open="isFinderOpen"
      :has-finder-run="hasFinderRun"
      :is-finder-running="isFinderRunning"
      :active-finder-result-key="activeFinderResultKey"
      :route-finder-options="routeFinderOptions"
      :is-loading="isLoading"
      :error-message="errorMessage"
      :theme="theme"
      @toggle-route="toggleRoute"
      @show-route="showRoute"
      @show-all-routes="showAllRoutes"
      @clear-visible-routes="clearVisibleRoutes"
      @reset-map="resetMap"
      @clear-finder-points="clearFinderPoints"
      @open-route-finder="openRouteFinder"
      @reset-finder-search="resetFinderSearch"
      @swap-finder-points="swapFinderPoints"
      @find-routes="runRouteFinder"
      @show-finder-result="showFinderResult"
      @toggle-theme="toggleTheme"
      @hide-sidebar="toggleSidebar"
      @close-mobile-menu="closeMobileMenu"
    />
    <button
      class="sidebar-toggle"
      type="button"
      :aria-expanded="String(!isSidebarHidden)"
      @click="toggleSidebar"
      aria-label="Show or hide routes"
    >
      <span></span>
      <span></span>
      <span></span>
      <strong>Hide routes</strong>
    </button>
    <button
      class="mobile-menu-button"
      type="button"
      :aria-expanded="String(isMobileMenuOpen)"
      aria-label="Open route menu"
      @click="toggleMobileMenu"
    >
      <span></span>
      <span></span>
      <span></span>
    </button>
    <div
      v-if="isMobileMenuOpen"
      class="mobile-drawer-backdrop"
      role="presentation"
      @click="closeMobileMenu"
    ></div>
    <div
      v-if="!isSidebarHidden"
      class="sidebar-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize route sidebar"
      @pointerdown.prevent="startSidebarResize"
    ></div>
    <main class="map-pane" aria-label="Interactive Cagayan de Oro jeepney route map">
      <MapView
        :routes="visibleRoutes"
        :all-routes="routes"
        :selected-route-ids="selectedRouteIds"
        :highlighted-route-ids="highlightedRouteIds"
        :start-point="startPoint"
        :end-point="endPoint"
        :transfer-point="transferPoint"
        :active-finder-result="activeFinderResult"
        @select-route="showRoute"
        @map-point-click="handleMapPointClick"
        @update-finder-point="updateFinderPoint"
      />
      <div v-if="isDisclaimerVisible" class="map-disclaimer" role="note">
        <span>This map shows CDO LPTRP reference routes. Actual jeepney operations may still follow existing/status quo routes. Verify with jeepney signage, drivers, and current local transport advisories.</span>
        <button
          class="map-disclaimer-close"
          type="button"
          aria-label="Dismiss route data disclaimer"
          @click="dismissDisclaimer"
        >
          x
        </button>
      </div>
      <button class="about-button" type="button" @click="isAboutOpen = true">
        About
      </button>
    </main>
    <div v-if="isFinderRunning" class="finder-loading-overlay" role="status" aria-live="assertive">
      <div class="finder-loading-panel">
        <span class="loading-spinner" aria-hidden="true"></span>
        <strong>Finding routes</strong>
        <span>Checking route geometry near your selected points...</span>
      </div>
    </div>
    <div
      v-if="isAboutOpen"
      class="modal-backdrop"
      role="presentation"
      @click.self="isAboutOpen = false"
    >
      <section
        class="about-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
      >
        <button
          class="modal-close"
          type="button"
          aria-label="Close About dialog"
          @click="isAboutOpen = false"
        >
          Close
        </button>
        <p class="eyebrow">CDO LPTRP route data</p>
        <h2 id="about-title">About This Map</h2>
        <p>
          This map displays CDO Local Public Transport Route Plan route data
          for reference using Leaflet and OpenStreetMap tiles. It is not a live
          map of currently operating jeepney routes.
        </p>
        <p>
          All route data is taken from the
          <a href="https://sites.google.com/view/cdo-routes-lptrp/home" target="_blank" rel="noreferrer">
            CDO Local Public Transport Route Plan website</a>.
          Updates to route data should be proposed through GitHub pull requests.
        </p>
        <h3>About the developer</h3>
        <p>
          Built by
          <a href="https://github.com/jrequiroso" target="_blank" rel="noreferrer">
            jrequiroso</a>,
          who apparently looked at jeepney route data and thought, "this needs a web app."
        </p>
      </section>
    </div>
  </div>
</template>

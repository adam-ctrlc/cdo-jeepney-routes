import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
} from '~/lib/geo'

// Cache API bucket for the routes file. Bump the version suffix whenever the
// shape of routes.json changes in a way that old cached copies can't satisfy.
const ROUTES_CACHE = 'cdo-jeep-routes-v1'

/**
 * useRouteExplorer — owns all application state and behaviour for the route
 * explorer (route list, map selection and the trip finder). The page is purely
 * presentational; everything else lives here.
 */
export function useRouteExplorer() {
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
  const isGuideOpen = ref(false)
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
  const activeDetailRoute = ref(null)

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

  const routeCount = computed(() => sortedRoutes.value.length)

  // Named places (route stops) with coordinates, for the Plan Trip selects.
  const selectablePlaces = computed(() => {
    const byName = new Map()
    for (const route of routes.value) {
      for (const stop of route.stops ?? []) {
        if (!stop?.name || !Number.isFinite(stop.lat) || !Number.isFinite(stop.lng)) {
          continue
        }
        const key = normalizeText(stop.name)
        if (!byName.has(key)) {
          byName.set(key, { name: stop.name, lat: stop.lat, lng: stop.lng })
        }
      }
    }
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
  })

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
        ...(route.stops ?? []).map((stop) => stop.name)
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
    // On mobile, reveal the map after picking a route from the drawer.
    isMobileMenuOpen.value = false
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

  // Route finding runs in a Web Worker so a heavy search never freezes the
  // page; it falls back to running inline when workers aren't available.
  let finderWorker = null
  let findSeq = 0
  const pendingFinds = new Map()

  function ensureFinderWorker() {
    if (finderWorker || !import.meta.client || typeof Worker === 'undefined') return
    try {
      finderWorker = new Worker(new URL('../lib/geo/finder.worker.js', import.meta.url), {
        type: 'module'
      })
      finderWorker.onmessage = (event) => {
        const { id, direct, transfer } = event.data
        const resolve = pendingFinds.get(id)
        if (resolve) {
          pendingFinds.delete(id)
          resolve({ direct, transfer })
        }
      }
    } catch {
      finderWorker = null
    }
  }

  function runFind(start, end, options) {
    if (!finderWorker) {
      return Promise.resolve({
        direct: findDirectRouteCandidates(finderRoutes.value, start, end, options),
        transfer: findTransferRouteCandidates(finderRoutes.value, start, end, {
          ...options,
          maxResults: options.maxTransferResults
        })
      })
    }
    const id = ++findSeq
    return new Promise((resolve) => {
      pendingFinds.set(id, resolve)
      finderWorker.postMessage({
        type: 'find',
        id,
        startPoint: { lat: start.lat, lng: start.lng },
        endPoint: { lat: end.lat, lng: end.lng },
        options
      })
    })
  }

  onBeforeUnmount(() => {
    finderWorker?.terminate()
    finderWorker = null
  })

  async function runRouteFinder() {
    if (!startPoint.value || !endPoint.value || isFinderRunning.value) return

    const options = {
      maxWalkToRouteMeters: MAX_WALK_TO_ROUTE_METERS,
      maxTransferWalkMeters: MAX_TRANSFER_WALK_METERS,
      walkWeight: WALK_WEIGHT,
      rideWeight: RIDE_WEIGHT,
      transferWalkWeight: TRANSFER_WALK_WEIGHT,
      transferPenaltyMeters: TRANSFER_PENALTY_METERS,
      maxResults: MAX_DIRECT_RESULTS,
      maxTransferResults: MAX_TRANSFER_RESULTS
    }
    isFinderRunning.value = true
    hasFinderRun.value = false
    activeFinderResult.value = null
    activeFinderResultKey.value = ''
    highlightedRouteIds.value = []
    transferPoint.value = null
    selectedRouteIds.value = []

    // Let the loading overlay paint before kicking off the search.
    await nextTick()

    try {
      const { direct, transfer } = await runFind(
        startPoint.value,
        endPoint.value,
        options
      )
      directResults.value = direct
      transferResults.value = transfer
      transferPoint.value = null
      highlightedRouteIds.value = []
      activeFinderResult.value = null
      activeFinderResultKey.value = ''
      hasFinderRun.value = true

      const firstResult = directResults.value[0] ?? transferResults.value[0]
      if (firstResult) {
        showFinderResult(firstResult, false)
      }

      if (import.meta.dev) {
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
      isFinderRunning.value = false
    }
  }

  function showFinderResult(result, closeMenu = true) {
    activeFinderResultKey.value = finderResultKey(result)
    selectedRouteIds.value = finderResultRouteIds(result)

    if (result.type === 'direct') {
      highlightedRouteIds.value = [result.routeId]
      transferPoint.value = null
    } else {
      highlightedRouteIds.value = [result.firstRouteId, result.secondRouteId]
      transferPoint.value = result.transferPoint
    }
    activeFinderResult.value = result

    // Tapping a result reveals the map on mobile (but not the auto-selection
    // right after a search, where the user is still reading the results).
    if (closeMenu) isMobileMenuOpen.value = false
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

  function openRouteDetails(route) {
    activeDetailRoute.value = route
  }

  function closeRouteDetails() {
    activeDetailRoute.value = null
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

  // Load the (static, serverless-hosted) routes file with a stale-while-
  // revalidate strategy backed by the Cache API: serve the cached copy instantly
  // on repeat visits while a background fetch silently refreshes the cache for
  // next time. Falls back to a plain network fetch wherever the Cache API is
  // absent or blocked (insecure context, private mode), so behaviour degrades to
  // exactly what it was before.
  async function loadRoutesJson(url) {
    try {
      if (typeof caches !== 'undefined') {
        const cache = await caches.open(ROUTES_CACHE)
        const cached = await cache.match(url)
        const revalidate = fetch(url).then((response) => {
          if (response.ok) cache.put(url, response.clone())
          return response
        })

        if (cached) {
          // Don't let a failed background refresh surface as an unhandled
          // rejection — the cached copy is already good enough for this visit.
          revalidate.catch(() => {})
          return cached.json()
        }

        const response = await revalidate
        if (!response.ok) throw new Error(`Unable to load routes: ${response.status}`)
        return response.json()
      }
    } catch (error) {
      if (import.meta.dev) {
        console.warn('[routes] cache unavailable, fetching directly', error)
      }
    }

    const response = await fetch(url)
    if (!response.ok) throw new Error(`Unable to load routes: ${response.status}`)
    return response.json()
  }

  onMounted(async () => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark' || savedTheme === 'light') {
      theme.value = savedTheme
    }
    isDisclaimerVisible.value = localStorage.getItem('disclaimerDismissed') !== 'true'

    const { baseURL } = useRuntimeConfig().app

    try {
      const loadedRoutes = (await loadRoutesJson(`${baseURL}data/routes.json`)).map(
        normalizeRouteGeometry
      )
      const validRoutes = loadedRoutes.filter(hasValidRouteGeometry)
      const skippedRoutes = loadedRoutes.filter((route) => !hasValidRouteGeometry(route))

      if (import.meta.dev && skippedRoutes.length > 0) {
        console.warn(
          '[routes] skipped invalid route geometry',
          skippedRoutes.map((route) => route?.id ?? route?.name ?? '(unknown route)')
        )
      }

      routes.value = validRoutes
      showDefaultRoutes()

      // Hand the routes to the finder worker once (avoids re-sending the heavy
      // geometry on every search). Send the RAW, non-reactive objects — Vue
      // reactive proxies can fail to structured-clone, which would silently
      // disable the worker and push the search back onto the main thread.
      ensureFinderWorker()
      try {
        const finderRoutesRaw = validRoutes.filter(
          (route) =>
            route.status !== 'not-yet-operational' && route.status !== 'for-clarification'
        )
        finderWorker?.postMessage({ type: 'init', routes: finderRoutesRaw })
      } catch {
        finderWorker = null
      }
    } catch (error) {
      errorMessage.value = error.message
    } finally {
      isLoading.value = false
    }
  })

  watch(
    theme,
    (nextTheme) => {
      // Theme is persisted in localStorage and reflected on <html>; both are
      // client-only, so guard against the prerender/SSR pass.
      if (import.meta.client) {
        document.documentElement.dataset.theme = nextTheme
        localStorage.setItem('theme', nextTheme)
      }
    },
    { immediate: true }
  )

  return {
    // state
    routes,
    selectedRouteIds,
    searchQuery,
    isLoading,
    errorMessage,
    isSidebarHidden,
    isMobileMenuOpen,
    sidebarWidth,
    isResizing,
    isAboutOpen,
    isGuideOpen,
    theme,
    isDisclaimerVisible,
    startPoint,
    endPoint,
    transferPoint,
    directResults,
    transferResults,
    hasFinderRun,
    highlightedRouteIds,
    activeFinderResult,
    activeFinderResultKey,
    isFinderRunning,
    isFinderOpen,
    activeDetailRoute,
    routeFinderOptions,
    // derived
    visibleRoutes,
    finderRoutes,
    directWalkMeters,
    filteredRoutes,
    routeCount,
    selectablePlaces,
    // actions
    toggleRoute,
    showRoute,
    showAllRoutes,
    clearVisibleRoutes,
    resetMap,
    clearFinderPoints,
    openRouteFinder,
    resetFinderSearch,
    swapFinderPoints,
    runRouteFinder,
    showFinderResult,
    toggleTheme,
    dismissDisclaimer,
    handleMapPointClick,
    updateFinderPoint,
    toggleSidebar,
    toggleMobileMenu,
    closeMobileMenu,
    openRouteDetails,
    closeRouteDetails,
    startSidebarResize
  }
}

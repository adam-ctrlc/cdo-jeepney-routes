<script setup>
/**
 * IndexPage — presentation only. All state and behaviour come from the
 * useRouteExplorer composable; the page just wires data into the components.
 *
 * @level Page
 * @composition AppShell, RouteSidebar, MapView, MapDisclaimer, AboutModal, FinderLoadingOverlay
 */
import { PhInfo } from '@phosphor-icons/vue'

const {
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
  visibleRoutes,
  finderRoutes,
  directWalkMeters,
  filteredRoutes,
  routeCount,
  selectablePlaces,
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
} = useRouteExplorer()
</script>

<template>
  <AppShell
    :is-sidebar-hidden="isSidebarHidden"
    :is-mobile-menu-open="isMobileMenuOpen"
    :is-resizing="isResizing"
    :sidebar-width="sidebarWidth"
    @toggle-sidebar="toggleSidebar"
    @toggle-mobile-menu="toggleMobileMenu"
    @close-mobile-menu="closeMobileMenu"
    @start-resize="startSidebarResize"
  >
    <template #sidebar>
      <RouteSidebar
        v-show="!isSidebarHidden"
        v-model:search-query="searchQuery"
        :routes="routes"
        :finder-routes="finderRoutes"
        :filtered-routes="filteredRoutes"
        :route-count="routeCount"
        :selected-route-ids="selectedRouteIds"
        :highlighted-route-ids="highlightedRouteIds"
        :places="selectablePlaces"
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
        @open-route-details="openRouteDetails"
        @set-finder-point="updateFinderPoint"
        @open-guide="isGuideOpen = true"
        @toggle-theme="toggleTheme"
        @hide-sidebar="toggleSidebar"
        @close-mobile-menu="closeMobileMenu"
      />
    </template>

    <template #map>
      <ClientOnly>
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
      </ClientOnly>
      <MapDisclaimer v-if="isDisclaimerVisible" @dismiss="dismissDisclaimer" />
      <button
        class="absolute bottom-[18px] right-3.5 z-[650] inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface/95 px-3 font-bold text-accent-strong shadow-card backdrop-blur-sm transition-colors hover:bg-surface-muted max-nav:bottom-3 max-nav:right-2.5 dark:bg-[#1e2024] dark:text-text"
        type="button"
        @click="isAboutOpen = true"
      >
        <PhInfo :size="17" weight="bold" /> About
      </button>
    </template>

    <template #overlays>
      <FinderLoadingOverlay v-if="isFinderRunning" />
      <RouteDetailsModal
        v-if="activeDetailRoute"
        :route="activeDetailRoute"
        @close="closeRouteDetails"
      />
      <GuideModal v-if="isGuideOpen" @close="isGuideOpen = false" />
      <AboutModal v-if="isAboutOpen" @close="isAboutOpen = false" />
    </template>
  </AppShell>
</template>

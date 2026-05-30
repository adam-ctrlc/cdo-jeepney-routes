<script setup>
/**
 * RouteSidebar — the left panel: brand row, tabs, the route finder and the
 * searchable route list. Child components are resolved through Nuxt
 * auto-imports.
 *
 * @level Organism
 * @composition IconButton, SidebarTabs, RouteFinder, RouteCard
 */
import { computed } from 'vue'
import {
  PhCaretLeft,
  PhEye,
  PhEyeSlash,
  PhGitFork,
  PhGithubLogo,
  PhMagnifyingGlass,
  PhMoon,
  PhQuestion,
  PhSun,
  PhX
} from '@phosphor-icons/vue'

const props = defineProps({
  routes: { type: Array, required: true },
  finderRoutes: { type: Array, required: true },
  filteredRoutes: { type: Array, required: true },
  routeCount: { type: Number, default: 0 },
  selectedRouteIds: { type: Array, required: true },
  highlightedRouteIds: { type: Array, default: () => [] },
  places: { type: Array, default: () => [] },
  startPoint: { type: Object, default: null },
  endPoint: { type: Object, default: null },
  directWalkMeters: { type: Number, default: null },
  directResults: { type: Array, required: true },
  transferResults: { type: Array, required: true },
  isFinderOpen: { type: Boolean, default: false },
  hasFinderRun: { type: Boolean, default: false },
  isFinderRunning: { type: Boolean, default: false },
  activeFinderResultKey: { type: String, default: '' },
  routeFinderOptions: { type: Object, required: true },
  searchQuery: { type: String, default: '' },
  isLoading: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' },
  theme: { type: String, default: 'light' }
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
  'set-finder-point',
  'open-route-details',
  'open-guide',
  'toggle-theme',
  'hide-sidebar',
  'close-mobile-menu'
])

function switchToViewRoutes() {
  if (props.isFinderOpen) emit('reset-finder-search')
}

function switchToPlanTrip() {
  if (!props.isFinderOpen) emit('open-route-finder')
}

const allShown = computed(
  () => props.routeCount > 0 && props.selectedRouteIds.length >= props.routeCount
)

function toggleAllRoutes() {
  emit(allShown.value ? 'clear-visible-routes' : 'show-all-routes')
}
</script>

<template>
  <aside
    class="z-[2] flex h-screen flex-col border-r border-border bg-surface shadow-card max-nav:fixed max-nav:inset-y-0 max-nav:left-0 max-nav:z-[900] max-nav:w-[min(92vw,380px)] max-nav:-translate-x-[105%] max-nav:transition-transform max-nav:duration-200 max-nav:[.mobile-menu-open_&]:translate-x-0"
  >
    <!-- Fixed top: brand, tabs, and (in View mode) search + toolbar -->
    <div
      class="flex shrink-0 flex-col gap-4 border-b border-border px-5 pb-4 pt-5 max-nav:px-4 max-nav:pt-4"
    >
      <header class="flex items-center gap-2">
        <p
          class="font-display m-0 flex min-w-0 flex-1 items-center gap-2 text-[1.05rem] font-semibold tracking-tight"
        >
          <img
            src="/logo-64.png"
            class="size-8 shrink-0 rounded-lg object-cover"
            alt=""
            width="32"
            height="32"
          />
          <span class="truncate">CDO Jeepney Routes</span>
        </p>
        <IconButton
          :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          :title="theme === 'dark' ? 'Light mode' : 'Dark mode'"
          @click="emit('toggle-theme')"
        >
          <PhSun v-if="theme === 'dark'" :size="19" weight="bold" />
          <PhMoon v-else :size="19" weight="bold" />
        </IconButton>
        <IconButton
          class="max-nav:hidden"
          aria-label="Hide sidebar"
          title="Hide sidebar"
          @click="emit('hide-sidebar')"
        >
          <PhCaretLeft :size="19" weight="bold" />
        </IconButton>
        <IconButton
          class="nav:hidden"
          aria-label="Close menu"
          @click="emit('close-mobile-menu')"
        >
          <PhX :size="19" weight="bold" />
        </IconButton>
      </header>

      <SidebarTabs
        :is-finder-open="isFinderOpen"
        @view-routes="switchToViewRoutes"
        @plan-trip="switchToPlanTrip"
      />

      <div v-if="!isFinderOpen" class="flex flex-col gap-2.5">
        <label class="sr-only" for="route-search">Search routes</label>
        <div class="relative">
          <PhMagnifyingGlass
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            :size="17"
            weight="bold"
          />
          <input
            id="route-search"
            class="h-11 w-full rounded-lg border border-border bg-surface-muted pl-9 pr-3 text-text placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-2 focus:outline-offset-0 focus:outline-accent/30 dark:bg-[#1e2024]"
            type="search"
            :value="searchQuery"
            placeholder="Search by name, area or street"
            @input="emit('update:searchQuery', $event.target.value)"
          />
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="m-0 text-[0.82rem] font-medium text-muted">
            <span v-if="searchQuery">{{ filteredRoutes.length }} matching</span>
            <span v-else>{{ selectedRouteIds.length }} of {{ routeCount }} on map</span>
          </p>
          <div class="flex items-center gap-1.5">
            <UiButton
              variant="ghost"
              class="min-h-[34px] px-2.5 text-xs"
              :aria-pressed="String(allShown)"
              @click="toggleAllRoutes"
            >
              <PhEyeSlash v-if="allShown" :size="15" weight="bold" />
              <PhEye v-else :size="15" weight="bold" />
              {{ allShown ? 'Hide all' : 'Show all' }}
            </UiButton>
            <UiButton
              variant="ghost"
              class="min-h-[34px] px-2.5 text-xs"
              title="How to use this map"
              @click="emit('open-guide')"
            >
              <PhQuestion :size="15" weight="bold" /> Guide
            </UiButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Scroll region: route grid (View) or the trip finder (Plan) -->
    <div
      class="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-gutter:stable] max-nav:px-4"
    >
      <RouteFinder
        v-if="isFinderOpen"
        :routes="finderRoutes"
        :places="places"
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
        @set-point="emit('set-finder-point', $event)"
      />

      <section v-else aria-label="Routes">
        <div class="grid grid-cols-2 gap-2">
          <template v-if="isLoading">
            <RouteCardSkeleton v-for="n in 8" :key="n" />
          </template>
          <p v-else-if="errorMessage" class="col-span-full m-0 text-[#a92828]">
            {{ errorMessage }}
          </p>
          <p v-else-if="filteredRoutes.length === 0" class="col-span-full m-0 text-muted">
            No routes match this search.
          </p>
          <RouteCard
            v-for="route in filteredRoutes"
            v-else
            :key="route.id"
            :route="route"
            :selected="selectedRouteIds.includes(route.id)"
            :active="highlightedRouteIds.includes(route.id)"
            @go-to-route="emit('show-route', route.id)"
            @open-details="emit('open-route-details', route)"
          />
        </div>
      </section>
    </div>

    <footer class="shrink-0 border-t border-border px-5 py-3.5 max-nav:px-4">
      <p class="m-0 flex items-center gap-1.5 text-[0.72rem] leading-snug text-muted">
        <img
          src="/logo-64.png"
          class="size-3.5 shrink-0 rounded object-cover"
          alt=""
          width="14"
          height="14"
        />
        Route data from
        <a
          class="font-bold text-accent-strong hover:underline"
          href="https://sites.google.com/view/cdo-routes-lptrp/home?authuser=0"
          target="_blank"
          rel="noreferrer"
          >CDO LPTRP</a
        >
      </p>
      <div class="mt-2.5 grid grid-cols-2 gap-1.5">
        <a
          class="flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-2.5 py-2 transition-colors hover:border-accent/50 hover:bg-border/40"
          href="https://github.com/adam-ctrlc/cdo-jeepney-routes"
          target="_blank"
          rel="noreferrer"
        >
          <PhGitFork class="shrink-0 text-accent-strong" :size="15" weight="bold" />
          <span class="grid min-w-0 leading-tight">
            <span class="truncate text-[0.7rem] font-bold text-text">This fork</span>
            <span class="truncate text-[0.62rem] text-muted">adam-ctrlc</span>
          </span>
        </a>
        <a
          class="flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-2.5 py-2 transition-colors hover:border-accent/50 hover:bg-border/40"
          href="https://github.com/jrequiroso/cdo-jeepney-routes"
          target="_blank"
          rel="noreferrer"
        >
          <PhGithubLogo class="shrink-0 text-accent-strong" :size="15" weight="fill" />
          <span class="grid min-w-0 leading-tight">
            <span class="truncate text-[0.7rem] font-bold text-text">Original</span>
            <span class="truncate text-[0.62rem] text-muted">jrequiroso</span>
          </span>
        </a>
      </div>
    </footer>
  </aside>
</template>

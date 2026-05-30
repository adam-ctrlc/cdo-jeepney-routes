<script setup>
/**
 * AppShell — the application layout skeleton: resizable sidebar, the mobile
 * drawer chrome and the map pane. Content is supplied through slots so the page
 * owns the data while the template owns the structure.
 *
 * @level Template
 * @composition MenuIcon
 */
defineProps({
  isSidebarHidden: { type: Boolean, default: false },
  isMobileMenuOpen: { type: Boolean, default: false },
  isResizing: { type: Boolean, default: false },
  sidebarWidth: { type: Number, default: 560 }
})

defineEmits(['toggle-sidebar', 'toggle-mobile-menu', 'close-mobile-menu', 'start-resize'])

const floatingButton =
  'fixed z-[700] grid size-[42px] cursor-pointer place-content-center rounded-lg border border-border bg-surface/95 text-accent-strong shadow-card backdrop-blur-sm transition-colors hover:bg-surface-muted dark:bg-[#1e2024] dark:text-text'
</script>

<template>
  <div
    class="app-shell relative grid min-h-screen max-nav:block"
    :class="[
      isSidebarHidden
        ? 'nav:grid-cols-[minmax(0,1fr)]'
        : 'nav:grid-cols-[minmax(280px,var(--sidebar-width,360px))_8px_minmax(0,1fr)]',
      isResizing && 'select-none',
      isMobileMenuOpen && 'mobile-menu-open'
    ]"
    :style="{ '--sidebar-width': `${sidebarWidth}px` }"
  >
    <slot name="sidebar" />

    <button
      v-show="isSidebarHidden"
      :class="[floatingButton, 'left-3.5 top-3.5 hidden nav:grid']"
      type="button"
      aria-label="Show routes"
      title="Show routes"
      @click="$emit('toggle-sidebar')"
    >
      <MenuIcon />
    </button>

    <button
      :class="[floatingButton, 'left-2.5 top-2.5 z-[850] nav:hidden']"
      type="button"
      aria-label="Open route menu"
      @click="$emit('toggle-mobile-menu')"
    >
      <MenuIcon />
    </button>

    <div
      v-if="isMobileMenuOpen"
      class="fixed inset-0 z-[880] bg-[rgba(14,23,21,0.42)] nav:hidden"
      role="presentation"
      @click="$emit('close-mobile-menu')"
    ></div>

    <div
      v-if="!isSidebarHidden"
      class="relative z-[3] cursor-col-resize bg-transparent max-nav:hidden after:absolute after:inset-y-0 after:left-[3px] after:w-[2px] after:bg-border hover:after:bg-accent"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize route sidebar"
      @pointerdown.prevent="$emit('start-resize', $event)"
    ></div>

    <main
      class="relative h-screen min-w-0 max-nav:min-h-[320px]"
      aria-label="Interactive Cagayan de Oro jeepney route map"
    >
      <slot name="map" />
    </main>

    <slot name="overlays" />
  </div>
</template>

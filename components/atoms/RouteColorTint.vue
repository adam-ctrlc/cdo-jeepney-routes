<script setup>
/**
 * RouteColorTint — a faint, flat wash of a route's map color, used to tie a
 * surface (e.g. a RouteCard) to the colored line that represents it on the map.
 *
 * Renders as an absolutely-positioned underlay: keep the host `relative` (and
 * `overflow-hidden` if it has rounded corners) and layer real content above it.
 * Kept low-opacity so it reads as a hint, not a fill, and never competes with
 * the active/selected accent.
 *
 * @level Atom
 */
defineProps({
  color: { type: String, required: true }
})
</script>

<template>
  <span
    class="route-color-tint pointer-events-none absolute inset-0"
    :style="{ '--route-color': color }"
    aria-hidden="true"
  ></span>
</template>

<style scoped>
.route-color-tint {
  background-color: color-mix(in srgb, var(--route-color) 10%, transparent);
  opacity: 0.7;
  transition: opacity 0.15s ease;
}
</style>

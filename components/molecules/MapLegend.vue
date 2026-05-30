<script setup>
/**
 * MapLegend — explains the ride/walk line styles on the map.
 *
 * @level Molecule
 */
</script>

<template>
  <div
    class="absolute bottom-[70px] right-3.5 z-[500] flex gap-3 rounded-lg border border-border bg-surface/95 px-2.5 py-2 text-[0.82rem] font-bold text-text shadow-card backdrop-blur-sm max-nav:bottom-[62px] max-nav:right-2.5 max-nav:flex-col max-nav:gap-1.5"
    aria-label="Route direction legend"
  >
    <span class="inline-flex items-center gap-1.5">
      <i
        class="inline-block h-0 w-7 border-t-4 border-accent-strong dark:border-[#e6bd4f]"
      ></i>
      Ride
    </span>
    <span class="inline-flex items-center gap-1.5">
      <i
        class="inline-block h-0 w-7 border-t-4 border-dashed border-accent-strong dark:border-[#e6bd4f]"
      ></i>
      Walk
    </span>
  </div>
</template>

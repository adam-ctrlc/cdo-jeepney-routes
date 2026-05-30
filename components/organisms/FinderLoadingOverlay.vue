<script setup>
/**
 * FinderLoadingOverlay — full-screen busy state while the route finder runs.
 *
 * @level Organism
 * @composition LoadingSpinner
 */
</script>

<template>
  <div
    class="fixed inset-0 z-[1400] grid place-items-center bg-[rgba(8,18,15,0.48)] p-5 backdrop-blur-sm dark:bg-[rgba(4,10,8,0.62)]"
    role="status"
    aria-live="assertive"
  >
    <div
      class="grid w-[min(320px,100%)] justify-items-center gap-2.5 rounded-2xl border border-white/70 bg-surface px-5 py-6 text-center shadow-card dark:border-[#343740]"
    >
      <LoadingSpinner />
      <strong class="text-base">Finding routes</strong>
      <span class="text-[0.86rem] leading-snug text-muted">
        Checking route geometry near your selected points…
      </span>
    </div>
  </div>
</template>

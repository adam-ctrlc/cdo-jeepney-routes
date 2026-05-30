<script setup>
/**
 * RouteCodeBadge — the route's code as an eyebrow label, with an optional
 * "For clarification" pill.
 *
 * @level Atom
 */
import { PhWarning } from '@phosphor-icons/vue'

defineProps({
  code: { type: String, required: true },
  forClarification: { type: Boolean, default: false }
})
</script>

<template>
  <span
    class="inline-flex flex-wrap items-center gap-1.5 text-[0.7rem] font-extrabold uppercase tracking-wide text-accent dark:text-[#e6bd4f]"
  >
    {{ code }}
    <span
      v-if="forClarification"
      class="inline-flex items-center gap-1 rounded-full bg-warning-bg px-1.5 py-0.5 text-[0.6rem] font-bold normal-case tracking-normal text-warning-text"
    >
      <PhWarning :size="11" weight="fill" /> For clarification
    </span>
  </span>
</template>

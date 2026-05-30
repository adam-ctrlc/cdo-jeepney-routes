<script setup>
/**
 * EmptyState — a centered, illustrated empty/zero-result block: a large icon
 * (default slot), a short title, and a supporting message.
 *
 * @level Molecule
 */
defineProps({
  title: { type: String, default: '' },
  message: { type: String, default: '' }
})
</script>

<template>
  <div class="grid justify-items-center gap-2 px-4 py-8 text-center">
    <span
      class="mb-1 grid size-16 place-items-center rounded-full bg-surface text-muted dark:bg-[#191a1e]"
    >
      <slot />
    </span>
    <p v-if="title" class="m-0 font-bold text-text">{{ title }}</p>
    <p v-if="message" class="m-0 max-w-[34ch] text-[0.84rem] leading-snug text-muted">
      {{ message }}
    </p>
  </div>
</template>

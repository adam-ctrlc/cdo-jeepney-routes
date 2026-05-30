<script setup>
/**
 * BaseModal — reusable dialog: dim backdrop, centered scrollable panel, close
 * button, Escape-to-close and click-outside-to-close. Provide a `title` (and
 * optional `eyebrow` / `#eyebrow` slot); the body goes in the default slot.
 *
 * @level Molecule
 */
import { onBeforeUnmount, onMounted, useId } from 'vue'
import { PhX } from '@phosphor-icons/vue'

const props = defineProps({
  title: { type: String, default: '' },
  eyebrow: { type: String, default: '' },
  size: { type: String, default: 'md' } // 'sm' | 'md' | 'lg'
})

const emit = defineEmits(['close'])
const titleId = useId()

const widthClass = {
  sm: 'w-[min(420px,100%)]',
  md: 'w-[min(540px,100%)]',
  lg: 'w-[min(640px,100%)]'
}

function onKeydown(event) {
  if (event.key === 'Escape') emit('close')
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div
    class="fixed inset-0 z-[1000] grid place-items-center bg-[rgba(14,23,21,0.42)] p-[18px]"
    role="presentation"
    @click.self="emit('close')"
  >
    <section
      class="relative grid max-h-[85vh] gap-3 overflow-y-auto rounded-2xl bg-surface p-6 shadow-card"
      :class="widthClass[size] ?? widthClass.md"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <button
        class="absolute right-3.5 top-3.5 grid size-9 cursor-pointer place-items-center rounded-lg border border-border bg-surface-muted text-accent-strong transition-colors hover:bg-border/40 focus-visible:outline-2 focus-visible:outline-accent"
        type="button"
        aria-label="Close dialog"
        @click="emit('close')"
      >
        <PhX :size="18" weight="bold" />
      </button>

      <div v-if="title || eyebrow || $slots.eyebrow" class="grid gap-1 pr-10">
        <slot name="eyebrow">
          <p
            v-if="eyebrow"
            class="m-0 text-[0.7rem] font-extrabold uppercase tracking-wide text-accent"
          >
            {{ eyebrow }}
          </p>
        </slot>
        <h2
          v-if="title"
          :id="titleId"
          class="font-display m-0 text-[1.35rem] font-semibold leading-tight tracking-tight"
        >
          {{ title }}
        </h2>
      </div>

      <slot />
    </section>
  </div>
</template>

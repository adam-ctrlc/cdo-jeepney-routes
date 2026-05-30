<script setup>
/**
 * GuideModal — a short, friendly "how to use this map" guide.
 *
 * @level Organism
 * @composition BaseModal
 */
import {
  PhEye,
  PhHandTap,
  PhMapPin,
  PhNavigationArrow,
  PhPath
} from '@phosphor-icons/vue'

defineEmits(['close'])
</script>

<template>
  <BaseModal title="How to use this map" size="md" @close="$emit('close')">
    <div class="grid gap-5">
      <section class="grid gap-2.5">
        <h3 class="m-0 text-[0.95rem] font-bold">Browse routes</h3>
        <ul class="m-0 grid list-none gap-2.5 p-0 [&_b]:font-bold [&_b]:text-text">
          <li class="flex items-start gap-3">
            <span
              class="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-accent-strong"
            >
              <PhHandTap :size="17" weight="bold" />
            </span>
            <span class="leading-snug text-muted">
              Tap a route card (e.g. <b>Bayabas R3</b>) to draw it on the map and zoom to
              it.
            </span>
          </li>
          <li class="flex items-start gap-3">
            <span
              class="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-accent-strong"
            >
              <PhEye :size="17" weight="bold" />
            </span>
            <span class="leading-snug text-muted">
              Tap the <b>eye icon</b> on a card to see a route's full details — areas,
              landmarks and the street list.
            </span>
          </li>
          <li class="flex items-start gap-3">
            <span
              class="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-accent-strong"
            >
              <PhEye :size="17" weight="bold" />
            </span>
            <span class="leading-snug text-muted">
              Use <b>Show all / Hide all</b> to toggle every route on the map at once.
            </span>
          </li>
        </ul>
      </section>

      <section class="grid gap-2.5">
        <h3 class="m-0 text-[0.95rem] font-bold">Plan a trip</h3>
        <ul class="m-0 grid list-none gap-2.5 p-0 [&_b]:font-bold [&_b]:text-text">
          <li class="flex items-start gap-3">
            <span
              class="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-accent-strong"
            >
              <PhPath :size="17" weight="bold" />
            </span>
            <span class="leading-snug text-muted"> Open the <b>Plan Trip</b> tab. </span>
          </li>
          <li class="flex items-start gap-3">
            <span
              class="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-accent-strong"
            >
              <PhMapPin :size="17" weight="bold" />
            </span>
            <span class="leading-snug text-muted">
              Set your <b>Start</b> and <b>Destination</b> — pick a place from the
              dropdown, or tap the map to drop a point.
            </span>
          </li>
          <li class="flex items-start gap-3">
            <span
              class="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-accent-strong"
            >
              <PhNavigationArrow :size="17" weight="fill" />
            </span>
            <span class="leading-snug text-muted">
              Tap <b>Find</b> to see suggested direct and transfer jeepney routes, then
              tap one to draw it on the map step by step.
            </span>
          </li>
        </ul>
      </section>

      <p class="m-0 text-[0.8rem] leading-snug text-muted">
        Routes are CDO LPTRP reference data and are approximate — always verify with
        jeepney signage and drivers.
      </p>
    </div>
  </BaseModal>
</template>

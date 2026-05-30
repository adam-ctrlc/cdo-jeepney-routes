<script setup>
/**
 * RouteDetailsModal — full reference details for one route, opened from a card.
 *
 * @level Organism
 * @composition BaseModal, RouteCodeBadge
 */
defineProps({
  route: { type: Object, required: true }
})

defineEmits(['close'])
</script>

<template>
  <BaseModal :title="route.name" @close="$emit('close')">
    <template #eyebrow>
      <RouteCodeBadge
        :code="route.code"
        :for-clarification="route.status === 'for-clarification'"
      />
    </template>

    <dl
      class="m-0 grid gap-2.5 text-[0.88rem] [&_dd]:m-0 [&_dd]:grid [&_dd]:gap-0.5 [&_dd]:leading-snug [&_dt]:text-[0.72rem] [&_dt]:font-bold [&_dt]:uppercase [&_dt]:tracking-wide [&_dt]:text-muted"
    >
      <dt>Status</dt>
      <dd>{{ route.status }}</dd>
      <dt>Areas</dt>
      <dd>{{ route.areas.join(', ') }}</dd>
      <dt>Landmarks</dt>
      <dd>{{ route.landmarks.join(', ') || 'None listed' }}</dd>
      <dt>Transfer points</dt>
      <dd>{{ route.transferPoints.join(', ') || 'None listed' }}</dd>
      <dt>Inbound</dt>
      <dd>
        <strong>{{ route.inbound.summary }}</strong>
        <span class="text-muted">{{ route.inbound.streets.join(', ') }}</span>
      </dd>
      <dt>Outbound</dt>
      <dd>
        <strong>{{ route.outbound.summary }}</strong>
        <span class="text-muted">{{ route.outbound.streets.join(', ') }}</span>
      </dd>
      <dt>Notes</dt>
      <dd>{{ route.notes }}</dd>
      <dt>Source</dt>
      <dd>{{ route.source }}</dd>
      <dt>Last updated</dt>
      <dd>{{ route.lastUpdated }}</dd>
    </dl>
  </BaseModal>
</template>

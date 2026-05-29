<script setup>
defineProps({
  route: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  },
  descriptionOpen: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle-route', 'toggle-description'])
</script>

<template>
  <article
    class="route-card"
    :class="{ selected }"
  >
    <span class="route-stripe" :style="{ backgroundColor: route.color }"></span>
    <div class="route-card-body">
      <label class="route-card-main">
        <input
          class="route-checkbox"
          type="checkbox"
          :checked="selected"
          @change="$emit('toggle-route')"
        />
        <span class="route-card-summary">
          <span class="route-card-title">
            <span class="route-code">
              {{ route.code }}
              <small v-if="route.status === 'for-clarification'">For clarification</small>
            </span>
            <strong>{{ route.name }}</strong>
          </span>
          <span class="muted">{{ route.areas.join(' - ') }}</span>
        </span>
      </label>
      <button
        class="accordion-button route-card-toggle"
        type="button"
        :aria-expanded="String(descriptionOpen)"
        @click.stop="$emit('toggle-description')"
      >
        {{ descriptionOpen ? 'Hide route description' : 'Show route description' }}
      </button>
      <div v-if="descriptionOpen" class="route-card-description">
        <dl>
          <dt>Status</dt>
          <dd>{{ route.status }}</dd>
          <dt>Areas</dt>
          <dd>{{ route.areas.join(', ') }}</dd>
          <dt>Landmarks</dt>
          <dd>{{ route.landmarks.join(', ') }}</dd>
          <dt>Transfer points</dt>
          <dd>{{ route.transferPoints.join(', ') || 'None listed' }}</dd>
          <dt>Source</dt>
          <dd>{{ route.source }}</dd>
          <dt>Last updated</dt>
          <dd>{{ route.lastUpdated }}</dd>
          <dt>Inbound</dt>
          <dd>
            <strong>{{ route.inbound.summary }}</strong>
            <span>{{ route.inbound.streets.join(', ') }}</span>
          </dd>
          <dt>Outbound</dt>
          <dd>
            <strong>{{ route.outbound.summary }}</strong>
            <span>{{ route.outbound.streets.join(', ') }}</span>
          </dd>
          <dt>Notes</dt>
          <dd>{{ route.notes }}</dd>
        </dl>
      </div>
    </div>
  </article>
</template>

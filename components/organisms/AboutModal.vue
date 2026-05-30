<script setup>
/**
 * AboutModal — dialog describing the data source and the developer.
 *
 * @level Organism
 * @composition BaseModal
 */
defineEmits(['close'])
</script>

<template>
  <BaseModal
    eyebrow="CDO LPTRP route data"
    title="About This Map"
    @close="$emit('close')"
  >
    <div
      class="grid gap-3 [&_a]:font-extrabold [&_a]:text-accent-strong [&_p]:m-0 [&_p]:leading-relaxed [&_p]:text-muted"
    >
      <p>
        This map displays CDO Local Public Transport Route Plan route data for reference
        using Leaflet and OpenStreetMap tiles. It is not a live map of currently operating
        jeepney routes.
      </p>
      <p>
        All route data is taken from the
        <a
          href="https://sites.google.com/view/cdo-routes-lptrp/home"
          target="_blank"
          rel="noreferrer"
          >CDO Local Public Transport Route Plan website</a
        >. Updates to route data should be proposed through GitHub pull requests.
      </p>
      <h3 class="m-0 mt-2 text-base font-bold">Credits</h3>
      <p>
        A big thank-you to
        <a href="https://github.com/jrequiroso" target="_blank" rel="noreferrer"
          >jrequiroso</a
        >, who created the original app and turned the city's jeepney route data into a
        map anyone can use.
      </p>
      <p>
        This is a friendly fork by
        <a href="https://github.com/adam-ctrlc" target="_blank" rel="noreferrer"
          >adam-ctrlc</a
        >, with a fresh design and a few extra touches — route details, a trip planner,
        and search. You can find the code on
        <a
          href="https://github.com/adam-ctrlc/cdo-jeepney-routes"
          target="_blank"
          rel="noreferrer"
          >GitHub</a
        >.
      </p>
    </div>
  </BaseModal>
</template>

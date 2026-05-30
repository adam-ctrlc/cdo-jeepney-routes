<script setup>
/**
 * MapView — interactive Leaflet map of routes, finder points and result overlays.
 *
 * @level Organism
 * @composition MapLegend
 * Leaflet is imported dynamically inside onMounted so this organism is safe to
 * include in the statically prerendered (SSG) output — it only touches the DOM
 * on the client.
 */
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'

// Leaflet instance, assigned from a dynamic import on mount (client only).
let L

const props = defineProps({
  routes: {
    type: Array,
    required: true
  },
  allRoutes: {
    type: Array,
    required: true
  },
  selectedRouteIds: {
    type: Array,
    required: true
  },
  highlightedRouteIds: {
    type: Array,
    default: () => []
  },
  startPoint: {
    type: Object,
    default: null
  },
  endPoint: {
    type: Object,
    default: null
  },
  transferPoint: {
    type: Array,
    default: null
  },
  activeFinderResult: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['select-route', 'map-point-click', 'update-finder-point'])

let map
let highlightLayer
let routeLayer
let markerLayer
let resultLayer
let resizeObserver
const polylines = new Map()
let hoveredSegmentId = ''
// Timestamp of the last programmatic highlight change, used to ignore the
// synthetic "tap-through" click that can hit the map on touch devices right
// after navigating to a route from the closing mobile drawer.
let lastHighlightAt = 0
const isCoarsePointer =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches

function routeSegments(route) {
  if (route.inboundPath?.length || route.outboundPath?.length) {
    return [
      {
        id: `${route.id}-inbound`,
        label: 'Inbound',
        points: route.inboundPath ?? [],
        dashArray: null
      },
      {
        id: `${route.id}-outbound`,
        label: 'Outbound',
        points: route.outboundPath ?? [],
        dashArray: '8 8'
      }
    ].filter((segment) => segment.points.length > 1)
  }

  if (route.paths?.inbound?.length || route.paths?.outbound?.length) {
    return [
      {
        id: `${route.id}-inbound`,
        label: 'Inbound',
        points: route.paths.inbound ?? [],
        dashArray: null
      },
      {
        id: `${route.id}-outbound`,
        label: 'Outbound',
        points: route.paths.outbound ?? [],
        dashArray: '8 8'
      }
    ].filter((segment) => segment.points.length > 1)
  }

  return [
    {
      id: route.id,
      label: 'Route',
      points: route.path,
      dashArray: null
    }
  ]
}

function routeBoundsPoints(route) {
  const segmentPoints = routeSegments(route).flatMap((segment) => segment.points)
  return segmentPoints.length ? segmentPoints : route.path
}

// Scale the line weight with the zoom level so routes get thicker (and easier
// to hover) as you zoom in, instead of staying a fixed pixel width.
function weightForZoom() {
  const zoom = map ? map.getZoom() : 13
  return Math.max(3, Math.min(11, Math.round(5 + (zoom - 13) * 1.4)))
}

function routeStyle(
  route,
  isHovered = false,
  isHighlighted = false,
  hasHighlights = false
) {
  const base = weightForZoom()
  return {
    color: route.color,
    weight: isHovered || isHighlighted ? base + 3 : base,
    opacity: isHovered || isHighlighted ? 1 : hasHighlights ? 0.18 : 0.8,
    lineCap: 'round',
    lineJoin: 'round'
  }
}

function popupHtml(route, segmentLabel) {
  return `
    <strong>${route.code} ${route.name}</strong>
    <em>${segmentLabel}</em>
    <span>${route.areas.join(' - ')}</span>
    <small>${route.status}</small>
  `
}

function tooltipHtml(route, segmentLabel) {
  return `<strong>${route.code}</strong> ${route.name} <em>${segmentLabel}</em>`
}

function drawRoutes() {
  if (!map || !routeLayer) return

  routeLayer.clearLayers()
  polylines.clear()
  hoveredSegmentId = ''

  props.routes.forEach((route) => {
    routeSegments(route).forEach((segment) => {
      // Imported coordinates are editable route geometry and still need operational verification.
      const polyline = L.polyline(segment.points, {
        ...routeStyle(
          route,
          false,
          props.highlightedRouteIds.includes(route.id),
          props.highlightedRouteIds.length > 0
        ),
        dashArray: segment.dashArray
      })
        .bindPopup(popupHtml(route, segment.label), { className: 'route-popup' })
        .bindTooltip(tooltipHtml(route, segment.label), {
          className: 'route-hover-tooltip',
          direction: 'top',
          opacity: 0.96,
          sticky: true
        })
        .on('mouseover', () => {
          hoveredSegmentId = segment.id
          polyline.setStyle({
            ...routeStyle(
              route,
              true,
              props.highlightedRouteIds.includes(route.id),
              props.highlightedRouteIds.length > 0
            ),
            dashArray: segment.dashArray
          })
          polyline.bringToFront()
        })
        .on('mouseout', () => {
          hoveredSegmentId = ''
          polyline.setStyle({
            ...routeStyle(
              route,
              false,
              props.highlightedRouteIds.includes(route.id),
              props.highlightedRouteIds.length > 0
            ),
            dashArray: segment.dashArray
          })
        })
        .on('click', (event) => {
          L.DomEvent.stopPropagation(event)
          // Ignore the synthetic tap-through click that can land on the map just
          // after navigating to a route from the closing mobile drawer.
          if (isCoarsePointer && performance.now() - lastHighlightAt < 600) return
          emit('select-route', route.id)
          polyline.openPopup()
        })

      polylines.set(segment.id, { routeId: route.id, segmentId: segment.id, polyline })
      polyline.addTo(routeLayer)
    })
  })
}

function markerIcon(label, className) {
  return L.divIcon({
    className: `route-point-marker ${className}`,
    html: `<span>${label}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  })
}

function stepLabelIcon(label) {
  return L.divIcon({
    className: 'route-step-label',
    html: `<span>${label}</span>`,
    iconSize: [120, 28],
    iconAnchor: [60, 14]
  })
}

function latLng(point) {
  return Array.isArray(point) ? point : [point.lat, point.lng]
}

function addStepLabel(point, label) {
  if (!point) return
  L.marker(latLng(point), {
    icon: stepLabelIcon(label),
    interactive: false,
    keyboard: false
  }).addTo(resultLayer)
}

function drawPolyline(points, options) {
  if (!points || points.length < 2) return null
  return L.polyline(points.map(latLng), {
    lineCap: 'round',
    lineJoin: 'round',
    ...options
  }).addTo(resultLayer)
}

function updateResultOverlay() {
  if (!resultLayer) return

  resultLayer.clearLayers()
  const result = props.activeFinderResult
  if (!result) return

  const walkStyle = {
    color: '#243832',
    weight: 4,
    opacity: 0.85,
    dashArray: '6 8'
  }
  const transferWalkStyle = {
    color: '#6a45c6',
    weight: 5,
    opacity: 0.95,
    dashArray: '4 7'
  }
  const rideStyle = (color) => ({
    color,
    weight: 8,
    opacity: 1
  })

  drawPolyline(result.walkToRoutePath, walkStyle)?.bindTooltip('Walk to jeepney route')
  drawPolyline(result.walkToDestinationPath, walkStyle)?.bindTooltip(
    'Walk to destination'
  )

  if (result.type === 'direct') {
    drawPolyline(result.ridePath, rideStyle(result.route.color))?.bindTooltip(
      `Ride ${result.route.code} ${result.direction}`
    )
    addStepLabel(result.startSnapPoint, 'Board here')
    addStepLabel(result.endSnapPoint, 'Get off here')
  } else {
    drawPolyline(result.firstRidePath, rideStyle(result.firstRoute.color))?.bindTooltip(
      `Ride ${result.firstRoute.code} ${result.firstDirection}`
    )
    drawPolyline(result.transferWalkPath, transferWalkStyle)?.bindTooltip(
      'Walk to transfer route'
    )
    drawPolyline(result.secondRidePath, rideStyle(result.secondRoute.color))?.bindTooltip(
      `Ride ${result.secondRoute.code} ${result.secondDirection}`
    )
    addStepLabel(result.startSnapPoint, 'Board here')
    addStepLabel(result.firstTransferPoint, 'Get off')
    addStepLabel(result.transferPoint, 'Transfer')
    addStepLabel(result.secondTransferPoint, 'Board next')
    addStepLabel(result.endSnapPoint, 'Get off here')
  }

  const overlayPoints = []
  resultLayer.eachLayer((layer) => {
    if (typeof layer.getLatLngs === 'function') {
      overlayPoints.push(...layer.getLatLngs())
    }
  })

  if (overlayPoints.length > 0) {
    const bounds = L.latLngBounds(overlayPoints)
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [42, 42], maxZoom: 16 })
    }
  }
}

function updateMarkers() {
  if (!markerLayer) return

  markerLayer.clearLayers()

  if (props.startPoint) {
    L.marker([props.startPoint.lat, props.startPoint.lng], {
      icon: markerIcon('S', 'start-marker'),
      draggable: true,
      autoPan: true
    })
      .bindTooltip('Start', { direction: 'top' })
      .on('dragend', (event) => {
        const nextPoint = event.target.getLatLng()
        emit('update-finder-point', {
          type: 'start',
          point: { lat: nextPoint.lat, lng: nextPoint.lng }
        })
      })
      .addTo(markerLayer)
  }

  if (props.endPoint) {
    L.marker([props.endPoint.lat, props.endPoint.lng], {
      icon: markerIcon('D', 'destination-marker'),
      draggable: true,
      autoPan: true
    })
      .bindTooltip('Destination', { direction: 'top' })
      .on('dragend', (event) => {
        const nextPoint = event.target.getLatLng()
        emit('update-finder-point', {
          type: 'end',
          point: { lat: nextPoint.lat, lng: nextPoint.lng }
        })
      })
      .addTo(markerLayer)
  }

  if (props.transferPoint) {
    L.marker(props.transferPoint, {
      icon: markerIcon('T', 'transfer-marker')
    })
      .bindTooltip('Approximate transfer area', { direction: 'top' })
      .addTo(markerLayer)
  }
}

function fitToRoutes(routes) {
  if (!map || routes.length === 0) return

  const bounds = L.latLngBounds(routes.flatMap((route) => routeBoundsPoints(route)))
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 })
  }
}

// Draw a white "casing" stroke beneath each highlighted (active) route so it
// stands out from the map and the other lines.
function updateHighlightCasings() {
  if (!highlightLayer || !map) return
  highlightLayer.clearLayers()
  // Skip the stroke when zoomed out — it would merge into a thick black mass.
  // Zoomed out, the active route already stands out (others fade to 18%).
  if (props.highlightedRouteIds.length === 0 || map.getZoom() < 14) return

  const casingWeight = weightForZoom() + 5
  props.routes
    .filter((route) => props.highlightedRouteIds.includes(route.id))
    .forEach((route) => {
      routeSegments(route).forEach((segment) => {
        if (segment.points.length < 2) return
        L.polyline(segment.points, {
          color: '#15171c',
          weight: casingWeight,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
          dashArray: segment.dashArray
        }).addTo(highlightLayer)
      })
    })
}

// Re-apply line styles to every polyline (colors, weights, hover/highlight
// emphasis) WITHOUT changing the map view.
function restyleRoutes() {
  const hasHighlights = props.highlightedRouteIds.length > 0

  // Draw the casing first so the colored lines brought to front below sit on
  // top of it (otherwise the stroke covers the route and it reads as solid black).
  updateHighlightCasings()

  polylines.forEach(({ routeId, segmentId, polyline }) => {
    const route = props.routes.find((item) => item.id === routeId)
    if (!route) return

    const segment = routeSegments(route).find((item) => item.id === segmentId)
    polyline.setStyle({
      ...routeStyle(
        route,
        hoveredSegmentId === segmentId,
        props.highlightedRouteIds.includes(routeId),
        hasHighlights
      ),
      dashArray: segment?.dashArray ?? polyline.options.dashArray
    })

    if (props.highlightedRouteIds.includes(routeId)) {
      polyline.bringToFront()
    }
  })
}

function updateSelectedRoute() {
  restyleRoutes()

  const hasHighlights = props.highlightedRouteIds.length > 0
  const routesToFit = hasHighlights
    ? props.routes.filter((route) => props.highlightedRouteIds.includes(route.id))
    : props.routes

  if (routesToFit.length > 0) {
    fitToRoutes(routesToFit)
  }
}

onMounted(async () => {
  L = (await import('leaflet')).default
  await nextTick()

  map = L.map('route-map', {
    center: [8.4542, 124.6319],
    zoom: 13,
    zoomControl: false,
    scrollWheelZoom: true
  })

  L.control.zoom({ position: 'topright' }).addTo(map)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map)

  highlightLayer = L.layerGroup().addTo(map)
  routeLayer = L.layerGroup().addTo(map)
  resultLayer = L.layerGroup().addTo(map)
  markerLayer = L.layerGroup().addTo(map)
  drawRoutes()
  updateResultOverlay()
  updateMarkers()
  fitToRoutes(props.routes)

  map.on('click', (event) => {
    emit('map-point-click', {
      lat: event.latlng.lat,
      lng: event.latlng.lng
    })
  })

  // Rescale line weights to the new zoom (without re-fitting the view).
  map.on('zoomend', restyleRoutes)

  const mapElement = document.getElementById('route-map')
  if (mapElement) {
    resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        map?.invalidateSize({ pan: false })
      })
    })
    resizeObserver.observe(mapElement)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (map) map.remove()
})

// Key on route ids only — deep-watching the routes (each carries thousands of
// coordinate points) made toggling all routes on/off janky.
watch(
  () => props.routes.map((route) => route.id).join(','),
  () => {
    drawRoutes()
    updateSelectedRoute()
  }
)

watch(
  () => props.selectedRouteIds,
  () => updateSelectedRoute()
)

watch(
  () => props.highlightedRouteIds,
  () => {
    lastHighlightAt = performance.now()
    updateSelectedRoute()
  }
)

watch(
  () => [props.startPoint, props.endPoint, props.transferPoint],
  () => updateMarkers(),
  { deep: true }
)

watch(
  () => props.activeFinderResult,
  () => updateResultOverlay(),
  { deep: true }
)
</script>

<template>
  <div class="relative h-full w-full">
    <div id="route-map" class="h-full w-full"></div>
    <MapLegend />
  </div>
</template>

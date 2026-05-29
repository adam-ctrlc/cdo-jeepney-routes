<script setup>
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import L from 'leaflet'

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
let routeLayer
let markerLayer
let resultLayer
let resizeObserver
const polylines = new Map()
let hoveredSegmentId = ''

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

function routeStyle(route, isHovered = false, isHighlighted = false, hasHighlights = false) {
  return {
    color: route.color,
    weight: isHovered || isHighlighted ? 8 : 5,
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
  drawPolyline(result.walkToDestinationPath, walkStyle)?.bindTooltip('Walk to destination')

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

function updateSelectedRoute() {
  const hasHighlights = props.highlightedRouteIds.length > 0

  polylines.forEach(({ routeId, segmentId, polyline }) => {
    const route = props.routes.find((item) => item.id === routeId)
    if (route) {
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
    }
  })

  const routesToFit = hasHighlights
    ? props.routes.filter((route) => props.highlightedRouteIds.includes(route.id))
    : props.routes

  if (routesToFit.length > 0) {
    fitToRoutes(routesToFit)
  }
}

onMounted(async () => {
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

watch(
  () => props.routes,
  () => {
    drawRoutes()
    updateSelectedRoute()
  },
  { deep: true }
)

watch(
  () => props.selectedRouteIds,
  () => updateSelectedRoute()
)

watch(
  () => props.highlightedRouteIds,
  () => updateSelectedRoute()
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
  <div class="map-frame">
    <div id="route-map" class="route-map"></div>
    <div class="map-legend" aria-label="Route direction legend">
      <span><i class="legend-line solid"></i> Ride</span>
      <span><i class="legend-line dashed"></i> Walk</span>
    </div>
  </div>
</template>
